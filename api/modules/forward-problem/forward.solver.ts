import { PrismaClient } from '@prisma/client';
import {
  ForwardProblemParams,
  ForwardProblemResult,
  BEMModel,
  ElectrodeData,
  SourceData,
  LeadFieldConfig,
  DEFAULT_LEADFIELD_CONFIG
} from './types';
import {
  generateLeadFieldMatrix,
  computeSVD,
  checkMatrixConditioning
} from './bem.utils';
import { computeMeshNormals } from '../head-model/mesh.utils';
import { normalizeVector, calculateVectorDot } from '../../utils/math';

export class ForwardProblemSolver {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public async solveForwardProblem(
    params: ForwardProblemParams,
    config?: Partial<LeadFieldConfig>
  ): Promise<ForwardProblemResult> {
    const startTime = Date.now();

    try {
      await this.logCompute(params.taskId, 'FORWARD_COMPUTING', 'Starting forward problem computation...');

      const leadfieldConfig: LeadFieldConfig = {
        ...DEFAULT_LEADFIELD_CONFIG,
        ...config
      };

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        `Loading head model ${params.headModelId}...`
      );

      const headModel = await this.prisma.headModel.findUnique({
        where: { id: params.headModelId }
      });

      if (!headModel) {
        throw new Error(`Head model ${params.headModelId} not found`);
      }

      const conductivityParams = params.conductivityParams || 
        (headModel.conductivityParams as any) || {
          scalp: 0.33,
          skull: 0.0042,
          brain: 0.33,
          unit: 'S/m'
        };

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        `Conductivity: scalp=${conductivityParams.scalp}, skull=${conductivityParams.skull}, brain=${conductivityParams.brain} S/m`
      );

      const scalpMesh = headModel.scalpMesh as any;
      const skullMesh = headModel.skullMesh as any;
      const brainMesh = headModel.brainMesh as any;

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        'Building BEM model with mesh normals...'
      );

      const bemModel: BEMModel = {
        scalp: {
          vertices: scalpMesh.vertices,
          faces: scalpMesh.faces,
          normals: computeMeshNormals(scalpMesh),
          conductivity: conductivityParams.scalp
        },
        skull: {
          vertices: skullMesh.vertices,
          faces: skullMesh.faces,
          normals: computeMeshNormals(skullMesh),
          conductivity: conductivityParams.skull
        },
        brain: {
          vertices: brainMesh.vertices,
          faces: brainMesh.faces,
          normals: computeMeshNormals(brainMesh),
          conductivity: conductivityParams.brain
        }
      };

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        'Loading electrode positions...'
      );

      const electrodes = await this.loadElectrodePositions(params.taskId);

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        `Loaded ${electrodes.length} electrodes`
      );

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        'Loading source positions...'
      );

      const sources = await this.loadSourcePositions(params.taskId, brainMesh, params.sourceModel);

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        `Loaded ${sources.length} sources, model: ${params.sourceModel}`
      );

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        `Generating leadfield matrix using ${params.method.toUpperCase()} method...`
      );

      const leadfieldMatrix = generateLeadFieldMatrix(
        sources,
        electrodes,
        bemModel,
        leadfieldConfig
      );

      const nElectrodes = electrodes.length;
      const nSources = sources.length;
      const nColumns = leadfieldMatrix[0]?.length || 0;

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        `Leadfield matrix size: ${nElectrodes} x ${nColumns}`
      );

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        'Performing SVD for matrix conditioning analysis...'
      );

      const conditioning = checkMatrixConditioning(leadfieldMatrix);

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        `Matrix condition number: ${conditioning.conditionNumber.toExponential(2)}, rank: ${conditioning.rank}/${nColumns}`
      );

      if (!conditioning.isWellConditioned) {
        await this.logCompute(
          params.taskId,
          'FORWARD_WARNING',
          `Leadfield matrix is ill-conditioned (${conditioning.conditionNumber.toExponential(2)}), consider regularization`,
          'WARNING'
        );
      }

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        'Saving forward result to database...'
      );

      const channelLabels = electrodes.map(e => e.label);
      const sourcePositions = sources.map(s => s.position);

      const forwardResult = await this.prisma.forwardResult.create({
        data: {
          taskId: params.taskId,
          leadfieldMatrix: {
            channels: channelLabels,
            sources: sourcePositions,
            matrix: leadfieldMatrix
          },
          solutionMethod: params.method.toUpperCase(),
          computationTime: (Date.now() - startTime) / 1000
        }
      });

      await this.prisma.task.update({
        where: { id: params.taskId },
        data: {
          forwardResultId: forwardResult.id
        }
      });

      const computationTime = (Date.now() - startTime) / 1000;

      await this.logCompute(
        params.taskId,
        'FORWARD_COMPUTING',
        `Forward problem solved in ${computationTime.toFixed(1)}s`
      );

      return {
        success: true,
        forwardResultId: forwardResult.id,
        leadfieldMatrix: {
          channels: channelLabels,
          sources: sourcePositions,
          matrix: leadfieldMatrix
        },
        solutionMethod: params.method.toUpperCase(),
        computationTime,
        metrics: {
          conditionNumber: conditioning.conditionNumber,
          rank: conditioning.rank,
          singularValues: computeSVD(leadfieldMatrix).S
        }
      };

    } catch (error) {
      const computationTime = (Date.now() - startTime) / 1000;
      
      await this.logCompute(
        params.taskId,
        'FORWARD_ERROR',
        `Forward problem failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ERROR'
      );

      return {
        success: false,
        leadfieldMatrix: {
          channels: [],
          sources: [],
          matrix: []
        },
        solutionMethod: params.method.toUpperCase(),
        computationTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async loadElectrodePositions(taskId: string): Promise<ElectrodeData[]> {
    const taskFiles = await this.prisma.taskFile.findMany({
      where: {
        taskId,
        fileType: 'ELECTRODE_POSITIONS'
      }
    });

    if (taskFiles.length > 0) {
      try {
        return [];
      } catch (error) {
        console.error('Error loading electrode positions from file:', error);
      }
    }

    const standardElectrodes = [
      { label: 'Fp1', position: [-32, 85, -8] as [number, number, number], isReference: false },
      { label: 'Fp2', position: [32, 85, -8] as [number, number, number], isReference: false },
      { label: 'F3', position: [-48, 55, 30] as [number, number, number], isReference: false },
      { label: 'F4', position: [48, 55, 30] as [number, number, number], isReference: false },
      { label: 'F7', position: [-60, 45, -10] as [number, number, number], isReference: false },
      { label: 'F8', position: [60, 45, -10] as [number, number, number], isReference: false },
      { label: 'Fz', position: [0, 60, 45] as [number, number, number], isReference: false },
      { label: 'C3', position: [-60, 0, 55] as [number, number, number], isReference: false },
      { label: 'C4', position: [60, 0, 55] as [number, number, number], isReference: false },
      { label: 'Cz', position: [0, 0, 70] as [number, number, number], isReference: false },
      { label: 'T3', position: [-70, -10, -10] as [number, number, number], isReference: false },
      { label: 'T4', position: [70, -10, -10] as [number, number, number], isReference: false },
      { label: 'T5', position: [-60, -50, -10] as [number, number, number], isReference: false },
      { label: 'T6', position: [60, -50, -10] as [number, number, number], isReference: false },
      { label: 'P3', position: [-40, -55, 45] as [number, number, number], isReference: false },
      { label: 'P4', position: [40, -55, 45] as [number, number, number], isReference: false },
      { label: 'Pz', position: [0, -60, 55] as [number, number, number], isReference: false },
      { label: 'O1', position: [-25, -80, 10] as [number, number, number], isReference: false },
      { label: 'O2', position: [25, -80, 10] as [number, number, number], isReference: false },
      { label: 'Oz', position: [0, -85, 5] as [number, number, number], isReference: false },
      { label: 'A1', position: [-75, -30, -35] as [number, number, number], isReference: true },
      { label: 'A2', position: [75, -30, -35] as [number, number, number], isReference: true }
    ];

    return standardElectrodes.map(elec => ({
      ...elec,
      position: normalizeVector(elec.position).map(v => v * 90) as [number, number, number]
    }));
  }

  private async loadSourcePositions(
    taskId: string,
    brainMesh: any,
    sourceModel: 'cortical' | 'volumetric' | 'mixed'
  ): Promise<SourceData[]> {
    const sources: SourceData[] = [];

    const brainNormals = computeMeshNormals(brainMesh);

    if (sourceModel === 'cortical' || sourceModel === 'mixed') {
      const corticalSources = brainMesh.sources || [];
      
      for (let i = 0; i < Math.min(corticalSources.length, 1000); i++) {
        const pos = corticalSources[i];
        const nearestVertex = this.findNearestVertex(pos, brainMesh.vertices);
        const normal = brainNormals[nearestVertex];
        
        sources.push({
          position: pos as [number, number, number],
          orientation: normal as [number, number, number],
          region: 'cortical'
        });
      }
    }

    if (sourceModel === 'volumetric' || sourceModel === 'mixed') {
      const volumeSources = brainMesh.sourceGrid || [];
      const startIdx = sources.length;
      
      for (let i = 0; i < Math.min(volumeSources.length, 500); i++) {
        const pos = volumeSources[i];
        
        sources.push({
          position: pos as [number, number, number],
          orientation: [0, 0, 1] as [number, number, number],
          region: 'subcortical'
        });
      }
    }

    return sources;
  }

  private findNearestVertex(point: number[], vertices: number[][]): number {
    let nearest = 0;
    let minDist = Infinity;

    for (let i = 0; i < vertices.length; i++) {
      const dist = Math.sqrt(
        Math.pow(point[0] - vertices[i][0], 2) +
        Math.pow(point[1] - vertices[i][1], 2) +
        Math.pow(point[2] - vertices[i][2], 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }

    return nearest;
  }

  private async logCompute(
    taskId: string,
    phase: string,
    content: string,
    level: string = 'INFO'
  ): Promise<void> {
    try {
      await this.prisma.computeLog.create({
        data: {
          taskId,
          computePhase: phase,
          logContent: content,
          logLevel: level
        }
      });
    } catch (error) {
      console.error('Failed to write compute log:', error);
    }
  }

  public async getForwardResult(taskId: string): Promise<any> {
    return this.prisma.forwardResult.findUnique({
      where: { taskId },
      include: {
        task: {
          select: {
            id: true,
            taskNo: true,
            patient: {
              select: {
                id: true,
                name: true,
                medicalRecordNo: true
              }
            }
          }
        }
      }
    });
  }

  public async getLeadfieldMatrix(taskId: string): Promise<{
    channels: string[];
    sources: number[][];
    matrix: number[][];
  } | null> {
    const forwardResult = await this.prisma.forwardResult.findUnique({
      where: { taskId }
    });

    if (!forwardResult) return null;

    return forwardResult.leadfieldMatrix as any;
  }

  public async getMatrixMetrics(taskId: string): Promise<{
    conditionNumber: number;
    rank: number;
    singularValues: number[];
  } | null> {
    const leadfield = await this.getLeadfieldMatrix(taskId);
    if (!leadfield || !leadfield.matrix.length) return null;

    const svd = computeSVD(leadfield.matrix);
    const conditioning = checkMatrixConditioning(leadfield.matrix);

    return {
      conditionNumber: conditioning.conditionNumber,
      rank: conditioning.rank,
      singularValues: svd.S
    };
  }
}

export default ForwardProblemSolver;
