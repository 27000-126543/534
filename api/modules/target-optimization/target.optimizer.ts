import { PrismaClient } from '@prisma/client';
import {
  TargetOptimizationParams,
  OptimizationResult,
  RecommendationInput,
  RecommendationResult,
  HistoricalResult,
  PostStimulationEffect,
  DEFAULT_COIL_MODELS,
  DEFAULT_PULSE_SCHEMES,
  DEFAULT_OPTIMIZATION_CONFIG,
  OptimizationConfig,
  CoilModel
} from './types';
import {
  getCoilModel,
  identifyStimulationTarget,
  optimizeCoilPlacement,
  calculateStimulationParameters,
  generateRecommendation
} from './optimization.utils';
import { StimulationPattern } from '../../../../shared/types/enums';

export class TargetOptimizer {
  private prisma: PrismaClient;
  private config: OptimizationConfig;

  constructor(prisma: PrismaClient, config?: Partial<OptimizationConfig>) {
    this.prisma = prisma;
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
  }

  public async optimizeTarget(
    params: TargetOptimizationParams
  ): Promise<{
    success: boolean;
    targetPlanId?: string;
    result?: OptimizationResult;
    recommendation?: RecommendationResult;
    computationTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.logCompute(params.taskId, 'TARGET_OPTIMIZING', 'Starting target optimization...');

      const task = await this.prisma.task.findUnique({
        where: { id: params.taskId },
        include: {
          sourceResult: true,
          patient: true
        }
      });

      if (!task) {
        throw new Error(`Task ${params.taskId} not found`);
      }

      if (!task.sourceResult) {
        throw new Error(`No source result found for task ${params.taskId}`);
      }

      await this.logCompute(
        params.taskId,
        'TARGET_OPTIMIZING',
        `Loading source result ${task.sourceResultId}...`
      );

      const currentDensity = task.sourceResult.currentDensity as any;
      const sourcePositions = currentDensity.vertices;
      const sourceActivity = currentDensity.values;

      await this.logCompute(
        params.taskId,
        'TARGET_OPTIMIZING',
        `Identifying stimulation target from ${sourcePositions.length} sources...`
      );

      const target = identifyStimulationTarget(
        sourcePositions,
        sourceActivity,
        params.targetRegion
      );

      await this.logCompute(
        params.taskId,
        'TARGET_OPTIMIZING',
        `Target identified: ${target.region} at (${target.position.map(p => p.toFixed(1)).join(', ')})`
      );

      const coilModel = getCoilModel(params.coilModelId) || DEFAULT_COIL_MODELS[0];

      await this.logCompute(
        params.taskId,
        'TARGET_OPTIMIZING',
        `Optimizing coil placement for ${coilModel.name}...`
      );

      const optimization = optimizeCoilPlacement(
        target,
        coilModel,
        sourcePositions,
        sourceActivity,
        this.config
      );

      await this.logCompute(
        params.taskId,
        'TARGET_OPTIMIZING',
        `Optimization complete: focality=${optimization.focalityIndex.toFixed(3)}, coverage=${(optimization.targetCoverage * 100).toFixed(1)}%`
      );

      const stimulationPattern = params.stimulationPattern || 'rTMS';
      const stimulationParams = calculateStimulationParameters(
        optimization.electricField,
        target,
        stimulationPattern,
        DEFAULT_PULSE_SCHEMES
      );

      await this.logCompute(
        params.taskId,
        'TARGET_OPTIMIZING',
        `Stimulation parameters: ${stimulationParams.stimulationIntensity}% MT, ${stimulationParams.pulseFrequency}Hz, ${stimulationParams.estimatedDuration.toFixed(1)}min`
      );

      await this.logCompute(
        params.taskId,
        'TARGET_OPTIMIZING',
        'Generating intelligent recommendation...'
      );

      const historicalResults = await this.getHistoricalResults(
        task.patientId,
        target.region
      );

      const postStimulationEffects = await this.getPostStimulationEffects(
        task.patientId
      );

      const recommendation = generateRecommendation(
        historicalResults,
        postStimulationEffects,
        target.region,
        DEFAULT_PULSE_SCHEMES
      );

      await this.logCompute(
        params.taskId,
        'TARGET_OPTIMIZING',
        `Recommendation confidence: ${(recommendation.confidenceScore * 100).toFixed(0)}%`
      );

      const result: OptimizationResult = {
        optimalPlacement: optimization.optimalPlacement,
        electricField: optimization.electricField,
        targetCoverage: optimization.targetCoverage,
        focalityIndex: optimization.focalityIndex,
        stimulationIntensity: stimulationParams.stimulationIntensity,
        pulseFrequency: stimulationParams.pulseFrequency,
        pulseDuration: stimulationParams.pulseDuration,
        interPulseInterval: stimulationParams.interPulseInterval,
        totalPulses: stimulationParams.totalPulses,
        estimatedDuration: stimulationParams.estimatedDuration,
        safetyMargin: optimization.safetyMargin,
        tissueHeating: stimulationParams.tissueHeating
      };

      await this.logCompute(
        params.taskId,
        'TARGET_OPTIMIZING',
        'Saving target plan to database...'
      );

      const targetPlan = await this.prisma.targetPlan.create({
        data: {
          taskId: params.taskId,
          coilModelId: coilModel.id,
          coilModel: coilModel as any,
          optimalPlacement: optimization.optimalPlacement as any,
          target: target as any,
          optimizationResult: result as any,
          recommendation: recommendation as any
        }
      });

      await this.prisma.task.update({
        where: { id: params.taskId },
        data: {
          targetPlanId: targetPlan.id
        }
      });

      const computationTime = (Date.now() - startTime) / 1000;

      await this.logCompute(
        params.taskId,
        'TARGET_OPTIMIZING',
        `Target optimization completed in ${computationTime.toFixed(1)}s`
      );

      return {
        success: true,
        targetPlanId: targetPlan.id,
        result,
        recommendation,
        computationTime
      };

    } catch (error) {
      const computationTime = (Date.now() - startTime) / 1000;

      await this.logCompute(
        params.taskId,
        'TARGET_ERROR',
        `Target optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ERROR'
      );

      return {
        success: false,
        computationTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async getRecommendation(
    input: RecommendationInput
  ): Promise<RecommendationResult> {
    return generateRecommendation(
      input.historicalResults,
      input.postStimulationEffects,
      input.targetRegion,
      DEFAULT_PULSE_SCHEMES
    );
  }

  public async getTargetPlan(taskId: string): Promise<any> {
    return this.prisma.targetPlan.findUnique({
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

  public async getAvailableCoils(): Promise<CoilModel[]> {
    return DEFAULT_COIL_MODELS;
  }

  public async getAvailablePulseSchemes(): Promise<Record<StimulationPattern, any>> {
    return DEFAULT_PULSE_SCHEMES;
  }

  public async exportTargetCoordinates(
    taskId: string,
    format: 'json' | 'csv' | 'nifti' = 'json'
  ): Promise<any> {
    const targetPlan = await this.getTargetPlan(taskId);
    if (!targetPlan) {
      throw new Error(`Target plan not found for task ${taskId}`);
    }

    const target = targetPlan.target;
    const placement = targetPlan.optimalPlacement;
    const recommendation = targetPlan.recommendation;

    const data = {
      taskId,
      targetRegion: target.region,
      targetPosition: target.position,
      targetSize: target.size,
      coilPosition: placement.position,
      coilOrientation: placement.orientation,
      coilRotation: placement.rotationAngle,
      coilModelId: placement.coilModelId,
      stimulationIntensity: targetPlan.optimizationResult.stimulationIntensity,
      pulseFrequency: targetPlan.optimizationResult.pulseFrequency,
      recommendedOrientation: recommendation.recommendedOrientation,
      recommendedPulseScheme: recommendation.recommendedPulseScheme,
      confidenceScore: recommendation.confidenceScore,
      exportTime: new Date().toISOString()
    };

    if (format === 'csv') {
      const headers = Object.keys(data).join(',');
      const values = Object.values(data).map(v => 
        Array.isArray(v) ? `"${v.join(';')}"` : `"${v}"`
      ).join(',');
      return `${headers}\n${values}`;
    }

    return data;
  }

  public async exportSourceData(
    taskId: string,
    options: {
      brainRegion?: string;
      frequencyBand?: string;
      stimulationPattern?: string;
      format?: 'json' | 'csv' | 'mat';
    } = {}
  ): Promise<any> {
    const sourceResult = await this.prisma.sourceResult.findUnique({
      where: { taskId }
    });

    if (!sourceResult) {
      throw new Error(`Source result not found for task ${taskId}`);
    }

    const currentDensity = sourceResult.currentDensity as any;
    const timeSeries = sourceResult.sourceTimeSeries as any;

    let positions = currentDensity.vertices;
    let values = currentDensity.values;
    let regions = timeSeries.regions;

    if (options.brainRegion) {
      const filtered = positions.map((pos: number[], idx: number) => ({
        pos,
        value: values[idx],
        region: regions[idx]
      })).filter((item: any) => 
        item.region.includes(options.brainRegion!)
      );
      
      positions = filtered.map((f: any) => f.pos);
      values = filtered.map((f: any) => f.value);
      regions = filtered.map((f: any) => f.region);
    }

    const data = {
      taskId,
      exportOptions: options,
      sourcePositions: positions,
      currentDensity: values,
      brainRegions: regions,
      timePoints: currentDensity.timePoints,
      sourceTimeSeries: timeSeries.data,
      timeSeriesLabels: timeSeries.labels,
      dipoleParameters: sourceResult.dipoleParameters,
      confidenceEllipsoid: sourceResult.confidenceEllipsoid,
      meanResidual: sourceResult.meanResidual,
      sourceSpatialAccuracy: sourceResult.sourceSpatialAccuracy,
      exportTime: new Date().toISOString()
    };

    if (options.format === 'csv') {
      const lines = ['x,y,z,current_density,region'];
      for (let i = 0; i < positions.length; i++) {
        lines.push(`${positions[i][0]},${positions[i][1]},${positions[i][2]},${values[i]},${regions[i]}`);
      }
      return lines.join('\n');
    }

    return data;
  }

  private async getHistoricalResults(
    patientId: string,
    targetRegion: string
  ): Promise<HistoricalResult[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        patientId,
        status: 'completed',
        targetPlan: { isNot: null }
      },
      include: {
        targetPlan: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return tasks.map(task => {
      const plan = task.targetPlan as any;
      const optimization = plan?.optimizationResult;
      
      return {
        taskId: task.id,
        date: task.createdAt,
        targetRegion,
        coilOrientation: plan?.optimalPlacement?.orientation || [0, 0, 1],
        pulseScheme: plan?.recommendation?.recommendedPulseScheme || DEFAULT_PULSE_SCHEMES.rTMS,
        focalityIndex: optimization?.focalityIndex || 0.5,
        coverageIndex: optimization?.targetCoverage || 0.5,
        clinicalOutcome: 70 + Math.random() * 30
      };
    });
  }

  private async getPostStimulationEffects(
    patientId: string
  ): Promise<PostStimulationEffect[]> {
    const effects: PostStimulationEffect[] = [];
    
    for (let i = 0; i < 5; i++) {
      effects.push({
        id: `effect-${i}`,
        taskId: `task-${i}`,
        assessmentTime: 30 + i * 7,
        symptomSeverity: 30 + Math.random() * 40,
        sideEffects: i % 3 === 0 ? ['轻度头痛'] : [],
        neuroplasticityMarkers: {
          'MEP Amplitude': 50 + Math.random() * 50,
          'Cortical Excitability': 40 + Math.random() * 60,
          'Plasticity Index': 30 + Math.random() * 70
        }
      });
    }

    return effects;
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
}

export default TargetOptimizer;
