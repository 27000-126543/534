import { AlgorithmType } from 'shared/types/enums';
import { AlgorithmParams, MonitoringMetric, DipoleParameters, ConfidenceEllipsoid } from 'shared/types/api';

export interface SourceImagingParams {
  taskId: string;
  forwardResultId: string;
  algorithmType: AlgorithmType;
  eegSignalPath: string;
  algorithmParams?: AlgorithmParams;
}

export interface SourceImagingResult {
  success: boolean;
  sourceResultId?: string;
  algorithmUsed: AlgorithmType;
  currentDensity: {
    vertices: number[][];
    values: number[];
    timePoints: number[];
    unit: string;
  };
  sourceTimeSeries: {
    labels: string[];
    regions: string[];
    data: number[][];
    timePoints: number[];
    unit: string;
    samplingRate: number;
  };
  dipoleParameters: DipoleParameters;
  confidenceEllipsoid: ConfidenceEllipsoid;
  meanResidual: number;
  sourceSpatialAccuracy: number;
  regularizationParam: number;
  monitoringMetrics: MonitoringMetric[];
  computationTime: number;
  error?: string;
}

export interface EEGData {
  channels: string[];
  data: number[][];
  timePoints: number[];
  samplingRate: number;
  unit: string;
}

export interface CovarianceMatrix {
  matrix: number[][];
  channels: string[];
  regularization: number;
}

export interface InverseSolution {
  sourceActivity: number[][];
  timePoints: number[];
  sourcePositions: number[][];
  residualError: number;
  regularizationParam: number;
}

export interface LORETAParams {
  regularizationParam: number;
  laplacianWeight: number;
  depthWeighting: boolean;
  depthWeightingExponent: number;
}

export interface SLORETAParams extends LORETAParams {
  standardize: boolean;
}

export interface BeamformingParams {
  regularizationParam: number;
  frequencyRange: [number, number];
  timeWindow: number;
  overlap: number;
  diagonalLoading: number;
}

export interface MNLSParams {
  regularizationParam: number;
  maxIterations: number;
  convergenceThreshold: number;
  l1Ratio: number;
}

export interface DICSParams {
  regularizationParam: number;
  frequencyRange: [number, number];
  timeWindow: number;
  overlap: number;
  coherenceThreshold: number;
}

export const DEFAULT_ALGORITHM_PARAMS: Record<AlgorithmType, any> = {
  [AlgorithmType.SLORETA]: {
    regularizationParam: 0.01,
    laplacianWeight: 0.5,
    depthWeighting: true,
    depthWeightingExponent: 0.5,
    standardize: true
  },
  [AlgorithmType.BEAMFORMING]: {
    regularizationParam: 0.05,
    frequencyRange: [8, 13],
    timeWindow: 1000,
    overlap: 500,
    diagonalLoading: 0.01
  },
  [AlgorithmType.MNLS]: {
    regularizationParam: 0.01,
    maxIterations: 100,
    convergenceThreshold: 1e-6,
    l1Ratio: 0.5
  },
  [AlgorithmType.LORETA]: {
    regularizationParam: 0.01,
    laplacianWeight: 0.5,
    depthWeighting: true,
    depthWeightingExponent: 0.5
  },
  [AlgorithmType.DICS]: {
    regularizationParam: 0.05,
    frequencyRange: [8, 13],
    timeWindow: 1000,
    overlap: 500,
    coherenceThreshold: 0.5
  }
};

export interface TimeWindowResult {
  timeWindow: number;
  timeRange: [number, number];
  sourceActivity: number[];
  residualError: number;
  sourceCenter: [number, number, number];
  offsetFromPrevious: number;
  dipoleFit: {
    position: [number, number, number];
    moment: [number, number, number];
    goodnessOfFit: number;
    residualError: number;
  };
}

export interface SourceImagingConfig {
  timeWindow: number;
  overlap: number;
  monitorResidualThreshold: number;
  monitorOffsetThreshold: number;
  saveIntermediateResults: boolean;
}

export const DEFAULT_SOURCE_IMAGING_CONFIG: SourceImagingConfig = {
  timeWindow: 100,
  overlap: 50,
  monitorResidualThreshold: 10,
  monitorOffsetThreshold: 5,
  saveIntermediateResults: false
};
