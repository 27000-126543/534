import { PrismaClient } from '@prisma/client';
import {
  HeadModelBuildParams,
  HeadModelBuildResult,
  MeshData,
  TissueConductivity,
  DEFAULT_CONDUCTIVITY,
  ElectrodePosition
} from './types';
import {
  generateThreeLayerHeadModel,
  calculateMeshQuality,
  smoothMesh,
  generateRegularSourceGrid,
  generateCorticalSources
} from './mesh.utils';
import { calculateVectorNormal, normalizeVector } from '../../utils/math';

export class HeadModelBuilder {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public async buildHeadModel(
    params: HeadModelBuildParams
  ): Promise<HeadModelBuildResult> {
    const startTime = Date.now();

    try {
      await this.logCompute(params.taskId, 'HEAD_MODEL_BUILDING', 'Starting head model construction...');

      const conductivityParams: TissueConductivity = {
        ...DEFAULT_CONDUCTIVITY,
        ...params.conductivityParams
      };

      const resolution = params.meshResolution || 'medium';
      const smoothingIterations = params.smoothingIterations || 3;

      await this.logCompute(
        params.taskId,
        'HEAD_MODEL_BUILDING',
        `Generating three-layer mesh with ${resolution} resolution...`
      );

      const headCenter = [0, 0, 0];
      const headRadius = 90;

      let { scalp, skull, brain } = generateThreeLayerHeadModel(
        headCenter,
        headRadius,
        resolution
      );

      await this.logCompute(
        params.taskId,
        'HEAD_MODEL_BUILDING',
        `Smoothing meshes (${smoothingIterations} iterations)...`
      );

      scalp = smoothMesh(scalp, smoothingIterations);
      skull = smoothMesh(skull, Math.max(1, smoothingIterations - 1));
      brain = smoothMesh(brain, Math.max(1, smoothingIterations - 2));

      await this.logCompute(
        params.taskId,
        'HEAD_MODEL_BUILDING',
        'Calculating mesh quality metrics...'
      );

      const scalpQuality = calculateMeshQuality(scalp);
      const skullQuality = calculateMeshQuality(skull);
      const brainQuality = calculateMeshQuality(brain);

      const overallQuality = (
        scalpQuality.qualityScore * 0.3 +
        skullQuality.qualityScore * 0.3 +
        brainQuality.qualityScore * 0.4
      );

      const totalTriangles = scalp.faces.length + skull.faces.length + brain.faces.length;

      await this.logCompute(
        params.taskId,
        'HEAD_MODEL_BUILDING',
        `Mesh quality: ${overallQuality.toFixed(1)}%, Total triangles: ${totalTriangles}`
      );

      const electrodePositions = await this.loadElectrodePositions(
        params.electrodePositionsPath,
        scalp
      );

      const brainMesh = brain;
      const sources = generateCorticalSources(brainMesh, 3);

      await this.logCompute(
        params.taskId,
        'HEAD_MODEL_BUILDING',
        `Generated ${sources.length} source points`
      );

      await this.logCompute(
        params.taskId,
        'HEAD_MODEL_BUILDING',
        'Saving head model to database...'
      );

      const headModel = await this.prisma.headModel.create({
        data: {
          taskId: params.taskId,
          scalpMesh: scalp,
          skullMesh: skull,
          brainMesh: {
            ...brain,
            sources,
            sourceGrid: generateRegularSourceGrid(brain, 8)
          },
          conductivityParams,
          meshQuality: overallQuality,
          triangleCount: totalTriangles
        }
      });

      await this.prisma.task.update({
        where: { id: params.taskId },
        data: {
          headModelId: headModel.id
        }
      });

      const computationTime = (Date.now() - startTime) / 1000;

      await this.logCompute(
        params.taskId,
        'HEAD_MODEL_BUILDING',
        `Head model completed in ${computationTime.toFixed(1)}s`
      );

      return {
        success: true,
        headModelId: headModel.id,
        scalpMesh: scalp,
        skullMesh: skull,
        brainMesh: brain,
        conductivityParams,
        meshQuality: overallQuality,
        triangleCount: totalTriangles,
        electrodePositions: electrodePositions.map(e => e.position),
        computationTime
      };

    } catch (error) {
      const computationTime = (Date.now() - startTime) / 1000;
      
      await this.logCompute(
        params.taskId,
        'HEAD_MODEL_ERROR',
        `Head model construction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ERROR'
      );

      return {
        success: false,
        conductivityParams: DEFAULT_CONDUCTIVITY,
        meshQuality: 0,
        triangleCount: 0,
        computationTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async loadElectrodePositions(
    filePath: string,
    scalpMesh: MeshData
  ): Promise<ElectrodePosition[]> {
    const standardElectrodes = [
      { label: 'Fp1', position: [-32, 85, -8] },
      { label: 'Fp2', position: [32, 85, -8] },
      { label: 'F3', position: [-48, 55, 30] },
      { label: 'F4', position: [48, 55, 30] },
      { label: 'F7', position: [-60, 45, -10] },
      { label: 'F8', position: [60, 45, -10] },
      { label: 'Fz', position: [0, 60, 45] },
      { label: 'C3', position: [-60, 0, 55] },
      { label: 'C4', position: [60, 0, 55] },
      { label: 'Cz', position: [0, 0, 70] },
      { label: 'T3', position: [-70, -10, -10] },
      { label: 'T4', position: [70, -10, -10] },
      { label: 'T5', position: [-60, -50, -10] },
      { label: 'T6', position: [60, -50, -10] },
      { label: 'P3', position: [-40, -55, 45] },
      { label: 'P4', position: [40, -55, 45] },
      { label: 'Pz', position: [0, -60, 55] },
      { label: 'O1', position: [-25, -80, 10] },
      { label: 'O2', position: [25, -80, 10] },
      { label: 'Oz', position: [0, -85, 5] },
      { label: 'A1', position: [-75, -30, -35] },
      { label: 'A2', position: [75, -30, -35] }
    ];

    const electrodes: ElectrodePosition[] = [];

    for (const elec of standardElectrodes) {
      const direction = normalizeVector(elec.position);
      const scalpRadius = 90;
      const projectedPosition = [
        direction[0] * scalpRadius,
        direction[1] * scalpRadius,
        direction[2] * scalpRadius
      ];

      electrodes.push({
        label: elec.label,
        position: projectedPosition as [number, number, number],
        isReference: elec.label === 'A1' || elec.label === 'A2'
      });
    }

    return electrodes;
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

  public async getHeadModel(taskId: string): Promise<any> {
    return this.prisma.headModel.findUnique({
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

  public async getHeadModelQuality(taskId: string): Promise<{
    overall: number;
    scalp: number;
    skull: number;
    brain: number;
  } | null> {
    const headModel = await this.prisma.headModel.findUnique({
      where: { taskId }
    });

    if (!headModel) return null;

    const scalpMesh = headModel.scalpMesh as any;
    const skullMesh = headModel.skullMesh as any;
    const brainMesh = headModel.brainMesh as any;

    return {
      overall: headModel.meshQuality,
      scalp: calculateMeshQuality(scalpMesh).qualityScore,
      skull: calculateMeshQuality(skullMesh).qualityScore,
      brain: calculateMeshQuality(brainMesh).qualityScore
    };
  }

  public async getSourcePositions(taskId: string): Promise<number[][] | null> {
    const headModel = await this.prisma.headModel.findUnique({
      where: { taskId }
    });

    if (!headModel) return null;

    const brainMesh = headModel.brainMesh as any;
    return brainMesh.sources || null;
  }
}

export default HeadModelBuilder;
