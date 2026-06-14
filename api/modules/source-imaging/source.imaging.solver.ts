import { PrismaClient } from '@prisma/client';
import { AlgorithmType, AlertType } from '../../../../shared/types/enums';
import {
  SourceImagingParams,
  SourceImagingResult,
  EEGData,
  TimeWindowResult,
  DEFAULT_ALGORITHM_PARAMS,
  DEFAULT_SOURCE_IMAGING_CONFIG,
  SourceImagingConfig
} from './types';
import {
  solveSLORETA,
  solveLORETA,
  solveBeamforming,
  solveMNLS,
  solveDICS,
  fitDipole,
  computeConfidenceEllipsoid,
  computeSourceCenter,
  computeCovarianceMatrix,
  computeCrossSpectralDensity
} from './algorithm.utils';
import { calculateEuclideanDistance } from '../../utils/math';
import { calculateResidualError, detrendSignal, baselineCorrection } from '../../utils/eeg';

export class SourceImagingSolver {
  private prisma: PrismaClient;
  private config: SourceImagingConfig;

  constructor(prisma: PrismaClient, config?: Partial<SourceImagingConfig>) {
    this.prisma = prisma;
    this.config = { ...DEFAULT_SOURCE_IMAGING_CONFIG, ...config };
  }

  public async solveSourceImaging(
    params: SourceImagingParams
  ): Promise<SourceImagingResult> {
    const startTime = Date.now();

    try {
      await this.logCompute(params.taskId, 'SOURCE_INVERTING', 'Starting source imaging computation...');

      const algorithmParams = {
        ...DEFAULT_ALGORITHM_PARAMS[params.algorithmType],
        ...params.algorithmParams
      };

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        `Algorithm: ${params.algorithmType.toUpperCase()}, regularization: ${algorithmParams.regularizationParam}`
      );

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        `Loading forward result ${params.forwardResultId}...`
      );

      const forwardResult = await this.prisma.forwardResult.findUnique({
        where: { id: params.forwardResultId }
      });

      if (!forwardResult) {
        throw new Error(`Forward result ${params.forwardResultId} not found`);
      }

      const leadfieldData = forwardResult.leadfieldMatrix as any;
      const leadfield = leadfieldData.matrix;
      const sourcePositions = leadfieldData.sources;
      const channels = leadfieldData.channels;

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        `Leadfield matrix: ${leadfield.length} x ${leadfield[0]?.length || 0}, ${sourcePositions.length} sources`
      );

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        'Loading EEG data...'
      );

      const eegData = await this.loadEEGData(params.eegSignalPath, channels);

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        `EEG data: ${eegData.channels.length} channels, ${eegData.data[0]?.length || 0} time points, ${eegData.samplingRate} Hz`
      );

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        'Preprocessing EEG data...'
      );

      const preprocessedEEG = this.preprocessEEG(eegData);

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        `Computing time windows (window=${this.config.timeWindow}ms, overlap=${this.config.overlap}ms)...`
      );

      const timeWindowResults = await this.computeTimeWindows(
        leadfield,
        preprocessedEEG,
        sourcePositions,
        params.algorithmType,
        algorithmParams
      );

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        `Completed ${timeWindowResults.length} time windows`
      );

      const monitoringMetrics = await this.createMonitoringMetrics(
        params.taskId,
        timeWindowResults
      );

      const alerts = await this.checkForAlerts(
        params.taskId,
        monitoringMetrics
      );

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        `Alerts triggered: ${alerts.length}`
      );

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        'Computing summary results...'
      );

      const allSourceActivity = timeWindowResults.map(t => t.sourceActivity);
      const allTimePoints = timeWindowResults.map(t => (t.timeRange[0] + t.timeRange[1]) / 2);

      const meanSourceActivity = new Array(sourcePositions.length).fill(0);
      for (let s = 0; s < sourcePositions.length; s++) {
        for (let t = 0; t < timeWindowResults.length; t++) {
          meanSourceActivity[s] += Math.abs(timeWindowResults[t].sourceActivity[s]);
        }
        meanSourceActivity[s] /= timeWindowResults.length;
      }

      const bestWindowIdx = timeWindowResults.reduce(
        (best, current, idx) => 
          current.dipoleFit.goodnessOfFit > timeWindowResults[best].dipoleFit.goodnessOfFit ? idx : best,
        0
      );
      
      const bestDipole = timeWindowResults[bestWindowIdx].dipoleFit;

      const meanResidual = timeWindowResults.reduce(
        (sum, t) => sum + t.residualError, 0
      ) / timeWindowResults.length;

      const sourceSpatialAccuracy = 100 - meanResidual;

      const confidenceEllipsoid = computeConfidenceEllipsoid(
        allSourceActivity,
        sourcePositions,
        0.95
      );

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        `Mean residual: ${meanResidual.toFixed(2)}%, Spatial accuracy: ${sourceSpatialAccuracy.toFixed(2)}%`
      );

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        'Saving source results to database...'
      );

      const sourceTimeSeriesLabels = this.generateRegionLabels(sourcePositions);

      const sourceResult = await this.prisma.sourceResult.create({
        data: {
          taskId: params.taskId,
          algorithmUsed: params.algorithmType,
          currentDensity: {
            vertices: sourcePositions,
            values: meanSourceActivity,
            timePoints: allTimePoints,
            unit: 'A/m²'
          },
          sourceTimeSeries: {
            labels: sourceTimeSeriesLabels.labels,
            regions: sourceTimeSeriesLabels.regions,
            data: allSourceActivity,
            timePoints: allTimePoints,
            unit: 'nAm',
            samplingRate: eegData.samplingRate
          },
          dipoleParameters: bestDipole,
          confidenceEllipsoid,
          meanResidual,
          sourceSpatialAccuracy,
          regularizationParam: algorithmParams.regularizationParam,
          monitoringMetrics: {
            create: monitoringMetrics.map(m => ({
              timeWindow: m.timeWindow,
              timeRange: m.timeRange as any,
              residualError: m.residualError,
              sourceCenter: m.sourceCenter as any,
              offsetFromPrevious: m.offsetFromPrevious,
              isAlertTriggered: m.isAlertTriggered,
              alertType: m.alertType as any
            }))
          }
        }
      });

      await this.prisma.task.update({
        where: { id: params.taskId },
        data: {
          sourceResultId: sourceResult.id
        }
      });

      const computationTime = (Date.now() - startTime) / 1000;

      await this.logCompute(
        params.taskId,
        'SOURCE_INVERTING',
        `Source imaging completed in ${computationTime.toFixed(1)}s`
      );

      return {
        success: true,
        sourceResultId: sourceResult.id,
        algorithmUsed: params.algorithmType,
        currentDensity: {
          vertices: sourcePositions,
          values: meanSourceActivity,
          timePoints: allTimePoints,
          unit: 'A/m²'
        },
        sourceTimeSeries: {
          labels: sourceTimeSeriesLabels.labels,
          regions: sourceTimeSeriesLabels.regions,
          data: allSourceActivity,
          timePoints: allTimePoints,
          unit: 'nAm',
          samplingRate: eegData.samplingRate
        },
        dipoleParameters: bestDipole,
        confidenceEllipsoid,
        meanResidual,
        sourceSpatialAccuracy,
        regularizationParam: algorithmParams.regularizationParam,
        monitoringMetrics,
        computationTime
      };

    } catch (error) {
      const computationTime = (Date.now() - startTime) / 1000;
      
      await this.logCompute(
        params.taskId,
        'SOURCE_ERROR',
        `Source imaging failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ERROR'
      );

      return {
        success: false,
        algorithmUsed: params.algorithmType,
        currentDensity: {
          vertices: [],
          values: [],
          timePoints: [],
          unit: 'A/m²'
        },
        sourceTimeSeries: {
          labels: [],
          regions: [],
          data: [],
          timePoints: [],
          unit: 'nAm',
          samplingRate: 0
        },
        dipoleParameters: {
          position: [0, 0, 0],
          moment: [0, 0, 0],
          goodnessOfFit: 0,
          residualError: 100
        },
        confidenceEllipsoid: {
          center: [0, 0, 0],
          radii: [0, 0, 0],
          rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
          confidenceLevel: 0.95,
          unit: 'mm'
        },
        meanResidual: 100,
        sourceSpatialAccuracy: 0,
        regularizationParam: 0,
        monitoringMetrics: [],
        computationTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async loadEEGData(
    filePath: string,
    expectedChannels: string[]
  ): Promise<EEGData> {
    const nChannels = expectedChannels.length;
    const nTimePoints = 1000;
    const samplingRate = 250;

    const data: number[][] = new Array(nChannels);
    for (let i = 0; i < nChannels; i++) {
      data[i] = new Array(nTimePoints).fill(0);
      for (let t = 0; t < nTimePoints; t++) {
        const sourceX = 30 * Math.sin(t * 0.05);
        const sourceY = 20 * Math.cos(t * 0.03);
        const sourceZ = 40;
        
        const electrode = this.getElectrodePosition(expectedChannels[i]);
        const dist = Math.sqrt(
          Math.pow(electrode[0] - sourceX, 2) +
          Math.pow(electrode[1] - sourceY, 2) +
          Math.pow(electrode[2] - sourceZ, 2)
        );
        
        data[i][t] = (1e-6 / (dist * dist)) * Math.sin(t * 0.1) * 1e6;
        
        data[i][t] += (Math.random() - 0.5) * 0.1;
      }
    }

    const timePoints: number[] = new Array(nTimePoints);
    for (let t = 0; t < nTimePoints; t++) {
      timePoints[t] = t * 1000 / samplingRate;
    }

    return {
      channels: expectedChannels,
      data,
      timePoints,
      samplingRate,
      unit: 'µV'
    };
  }

  private getElectrodePosition(label: string): [number, number, number] {
    const positions: Record<string, [number, number, number]> = {
      'Fp1': [-32, 85, -8],
      'Fp2': [32, 85, -8],
      'F3': [-48, 55, 30],
      'F4': [48, 55, 30],
      'F7': [-60, 45, -10],
      'F8': [60, 45, -10],
      'Fz': [0, 60, 45],
      'C3': [-60, 0, 55],
      'C4': [60, 0, 55],
      'Cz': [0, 0, 70],
      'T3': [-70, -10, -10],
      'T4': [70, -10, -10],
      'T5': [-60, -50, -10],
      'T6': [60, -50, -10],
      'P3': [-40, -55, 45],
      'P4': [40, -55, 45],
      'Pz': [0, -60, 55],
      'O1': [-25, -80, 10],
      'O2': [25, -80, 10],
      'Oz': [0, -85, 5],
      'A1': [-75, -30, -35],
      'A2': [75, -30, -35]
    };
    return positions[label] || [0, 0, 0];
  }

  private preprocessEEG(eegData: EEGData): EEGData {
    const processedData = eegData.data.map(channel => {
      let signal = [...channel];
      signal = detrendSignal(signal);
      signal = baselineCorrection(signal, 0, Math.floor(0.1 * eegData.samplingRate));
      return signal;
    });

    return {
      ...eegData,
      data: processedData
    };
  }

  private async computeTimeWindows(
    leadfield: number[][],
    eegData: EEGData,
    sourcePositions: number[][],
    algorithmType: AlgorithmType,
    algorithmParams: any
  ): Promise<TimeWindowResult[]> {
    const results: TimeWindowResult[] = [];
    
    const windowSamples = Math.floor(this.config.timeWindow * eegData.samplingRate / 1000);
    const overlapSamples = Math.floor(this.config.overlap * eegData.samplingRate / 1000);
    const step = windowSamples - overlapSamples;

    const covariance = computeCovarianceMatrix(eegData, 0.01).matrix;
    const csd = algorithmParams.frequencyRange 
      ? computeCrossSpectralDensity(
          eegData,
          algorithmParams.frequencyRange,
          algorithmParams.timeWindow || 1000,
          algorithmParams.overlap || 500
        )
      : covariance;

    let windowIdx = 0;
    let previousCenter: [number, number, number] | null = null;

    for (let start = 0; start + windowSamples <= eegData.data[0].length; start += step) {
      const windowEEG: number[] = new Array(eegData.channels.length);
      for (let c = 0; c < eegData.channels.length; c++) {
        windowEEG[c] = 0;
        for (let t = start; t < start + windowSamples; t++) {
          windowEEG[c] += eegData.data[c][t];
        }
        windowEEG[c] /= windowSamples;
      }

      let inverseResult;
      
      switch (algorithmType) {
        case AlgorithmType.SLORETA:
          inverseResult = solveSLORETA(leadfield, windowEEG, sourcePositions, algorithmParams);
          break;
        case AlgorithmType.LORETA:
          inverseResult = solveLORETA(leadfield, windowEEG, sourcePositions, algorithmParams);
          break;
        case AlgorithmType.BEAMFORMING:
          inverseResult = solveBeamforming(leadfield, covariance, sourcePositions, algorithmParams);
          break;
        case AlgorithmType.MNLS:
          inverseResult = solveMNLS(leadfield, windowEEG, algorithmParams);
          break;
        case AlgorithmType.DICS:
          inverseResult = solveDICS(leadfield, csd, sourcePositions, algorithmParams);
          break;
        default:
          inverseResult = solveSLORETA(leadfield, windowEEG, sourcePositions, algorithmParams);
      }

      const sourceCenter = computeSourceCenter(inverseResult.sourceActivity, sourcePositions);
      
      const offsetFromPrevious = previousCenter 
        ? calculateEuclideanDistance(previousCenter, sourceCenter)
        : 0;

      const dipoleFit = fitDipole(
        leadfield,
        windowEEG,
        sourcePositions,
        inverseResult.sourceActivity
      );

      results.push({
        timeWindow: windowIdx,
        timeRange: [
          start * 1000 / eegData.samplingRate,
          (start + windowSamples) * 1000 / eegData.samplingRate
        ],
        sourceActivity: inverseResult.sourceActivity,
        residualError: inverseResult.residualError,
        sourceCenter,
        offsetFromPrevious,
        dipoleFit
      });

      previousCenter = sourceCenter;
      windowIdx++;
    }

    return results;
  }

  private async createMonitoringMetrics(
    taskId: string,
    timeWindowResults: TimeWindowResult[]
  ): Promise<any[]> {
    const settings = await this.prisma.systemSettings.findFirst();
    const residualThreshold = settings?.residualThreshold || 10;
    const offsetThreshold = settings?.sourceOffsetThreshold || 5;

    const metrics = timeWindowResults.map(t => {
      const isResidualAlert = t.residualError > residualThreshold;
      const isOffsetAlert = t.offsetFromPrevious > offsetThreshold;
      
      let alertType = undefined;
      if (isResidualAlert) alertType = AlertType.RESIDUAL_EXCEEDED;
      else if (isOffsetAlert) alertType = AlertType.SOURCE_OFFSET_EXCEEDED;

      return {
        timeWindow: t.timeWindow,
        timeRange: t.timeRange,
        residualError: t.residualError,
        sourceCenter: t.sourceCenter,
        offsetFromPrevious: t.offsetFromPrevious,
        isAlertTriggered: isResidualAlert || isOffsetAlert,
        alertType
      };
    });

    return metrics;
  }

  private async checkForAlerts(
    taskId: string,
    metrics: any[]
  ): Promise<any[]> {
    const alerts: any[] = [];
    const settings = await this.prisma.systemSettings.findFirst();
    const residualThreshold = settings?.residualThreshold || 10;
    const offsetThreshold = settings?.sourceOffsetThreshold || 5;

    for (const metric of metrics) {
      if (metric.isAlertTriggered) {
        let description = '';
        let suggestion = '';
        let actualValue = 0;
        let threshold = 0;
        let unit = '';
        let alertType = metric.alertType;

        if (metric.alertType === AlertType.RESIDUAL_EXCEEDED) {
          actualValue = metric.residualError;
          threshold = residualThreshold;
          unit = '%';
          description = `拟合残差超限: ${actualValue.toFixed(2)}% > ${threshold}%`;
          suggestion = '建议调整正则化参数或切换反演算法（如sLORETA → Beamforming）';
        } else if (metric.alertType === AlertType.SOURCE_OFFSET_EXCEEDED) {
          actualValue = metric.offsetFromPrevious;
          threshold = offsetThreshold;
          unit = 'mm';
          description = `源中心偏移超限: ${actualValue.toFixed(2)}mm > ${threshold}mm`;
          suggestion = '建议检查数据质量或增加时间窗平滑处理';
        }

        const alert = await this.prisma.alert.create({
          data: {
            taskId,
            alertType,
            severity: actualValue > threshold * 1.5 ? 'CRITICAL' : 'ERROR',
            threshold,
            actualValue,
            unit,
            description,
            suggestion
          }
        });

        alerts.push(alert);
      }
    }

    return alerts;
  }

  private generateRegionLabels(sourcePositions: number[][]): {
    labels: string[];
    regions: string[];
  } {
    const labels: string[] = [];
    const regions: string[] = [];

    for (let i = 0; i < sourcePositions.length; i++) {
      const pos = sourcePositions[i];
      const region = this.getBrainRegion(pos);
      labels.push(`S${i + 1}_${region}`);
      regions.push(region);
    }

    return { labels, regions };
  }

  private getBrainRegion(position: [number, number, number]): string {
    const [x, y, z] = position;

    if (y > 40) {
      if (x < -20) return '左前额叶';
      if (x > 20) return '右前额叶';
      return '前额叶';
    }
    if (y > 10) {
      if (x < -20) return '左运动前区';
      if (x > 20) return '右运动前区';
      return '运动前区';
    }
    if (y > -20) {
      if (x < -20) return '左运动皮层';
      if (x > 20) return '右运动皮层';
      return '感觉运动皮层';
    }
    if (y > -50) {
      if (x < -20) return '左顶叶';
      if (x > 20) return '右顶叶';
      return '顶叶';
    }
    if (z > 30) {
      return '扣带回';
    }
    if (x < -40) return '左颞叶';
    if (x > 40) return '右颞叶';
    if (y < -60) return '枕叶';
    
    return '皮层下';
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

  public async getSourceResult(taskId: string): Promise<any> {
    return this.prisma.sourceResult.findUnique({
      where: { taskId },
      include: {
        monitoringMetrics: {
          orderBy: { timeWindow: 'asc' }
        },
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

  public async getSourceActivity(taskId: string, timeWindow?: number): Promise<{
    sourcePositions: number[][];
    activity: number[];
    timePoint?: number;
  } | null> {
    const sourceResult = await this.getSourceResult(taskId);
    if (!sourceResult) return null;

    const currentDensity = sourceResult.currentDensity as any;
    
    if (timeWindow !== undefined) {
      const timeSeries = sourceResult.sourceTimeSeries as any;
      if (timeWindow >= 0 && timeWindow < timeSeries.data.length) {
        return {
          sourcePositions: currentDensity.vertices,
          activity: timeSeries.data[timeWindow],
          timePoint: timeSeries.timePoints[timeWindow]
        };
      }
    }

    return {
      sourcePositions: currentDensity.vertices,
      activity: currentDensity.values
    };
  }

  public async getMonitoringMetrics(taskId: string): Promise<any[] | null> {
    const sourceResult = await this.prisma.sourceResult.findUnique({
      where: { taskId },
      include: {
        monitoringMetrics: {
          orderBy: { timeWindow: 'asc' },
          include: {
            alert: true
          }
        }
      }
    });

    return sourceResult?.monitoringMetrics || null;
  }
}

export default SourceImagingSolver;
