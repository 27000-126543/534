import { FrequencyBand, StimulationPattern } from '../../../../shared/types/enums';

export interface CoilModel {
  id: string;
  name: string;
  type: 'figure8' | 'circular' | 'double-cone' | 'H-coil';
  manufacturer: string;
  modelNumber: string;
  outerDiameter: number;
  innerDiameter: number;
  windingTurns: number;
  wireRadius: number;
  maximumCurrent: number;
  efficiency: number;
  coolingType: string;
}

export interface CoilPlacement {
  position: [number, number, number];
  orientation: [number, number, number];
  rotationAngle: number;
  coilModelId: string;
}

export interface StimulationTarget {
  id: string;
  position: [number, number, number];
  region: string;
  hemisphere: 'left' | 'right' | 'bilateral';
  size: number;
  intensity: number;
}

export interface ElectricFieldResult {
  positions: number[][];
  eFieldMagnitude: number[];
  eFieldDirection: number[][];
  maximumEF: number;
  meanEF: number;
  focalVolume: number;
  focalityIndex: number;
}

export interface TargetOptimizationParams {
  taskId: string;
  sourceResultId: string;
  coilModelId: string;
  targetRegion?: string;
  frequencyBand?: FrequencyBand;
  targetIntensity?: number;
  stimulationPattern?: StimulationPattern;
  searchRadius?: number;
  gridResolution?: number;
  maxIterations?: number;
}

export interface OptimizationResult {
  optimalPlacement: CoilPlacement;
  electricField: ElectricFieldResult;
  targetCoverage: number;
  focalityIndex: number;
  stimulationIntensity: number;
  pulseFrequency: number;
  pulseDuration: number;
  interPulseInterval: number;
  totalPulses: number;
  estimatedDuration: number;
  safetyMargin: number;
  tissueHeating: number;
}

export interface RecommendationInput {
  patientId: string;
  targetRegion: string;
  historicalResults: HistoricalResult[];
  postStimulationEffects: PostStimulationEffect[];
}

export interface HistoricalResult {
  taskId: string;
  date: Date;
  targetRegion: string;
  coilOrientation: [number, number, number];
  pulseScheme: PulseScheme;
  focalityIndex: number;
  coverageIndex: number;
  clinicalOutcome: number;
}

export interface PostStimulationEffect {
  id: string;
  taskId: string;
  assessmentTime: number;
  symptomSeverity: number;
  sideEffects: string[];
  neuroplasticityMarkers: Record<string, number>;
}

export interface PulseScheme {
  pattern: StimulationPattern;
  frequency: number;
  intensity: number;
  pulseDuration: number;
  interTrainInterval: number;
  trainsPerSession: number;
  pulsesPerTrain: number;
  sessionsPerWeek: number;
  totalSessions: number;
}

export interface RecommendationResult {
  recommendedOrientation: [number, number, number];
  recommendedPulseScheme: PulseScheme;
  confidenceScore: number;
  expectedFocality: number;
  expectedCoverage: number;
  rationale: string;
  alternatives: {
    orientation: [number, number, number];
    pulseScheme: PulseScheme;
    confidenceScore: number;
  }[];
}

export interface TargetPlanData {
  id: string;
  taskId: string;
  coilModel: CoilModel;
  optimalPlacement: CoilPlacement;
  target: StimulationTarget;
  optimizationResult: OptimizationResult;
  recommendation: RecommendationResult;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_COIL_MODELS: CoilModel[] = [
  {
    id: 'coil-001',
    name: 'MagPro X100 Figure-8',
    type: 'figure8',
    manufacturer: 'MagVenture',
    modelNumber: 'MC-B70',
    outerDiameter: 90,
    innerDiameter: 50,
    windingTurns: 8,
    wireRadius: 2.5,
    maximumCurrent: 5000,
    efficiency: 0.72,
    coolingType: 'air'
  },
  {
    id: 'coil-002',
    name: 'Rapid2 Circular',
    type: 'circular',
    manufacturer: 'MagStim',
    modelNumber: 'C-100',
    outerDiameter: 110,
    innerDiameter: 60,
    windingTurns: 12,
    wireRadius: 3.0,
    maximumCurrent: 4500,
    efficiency: 0.68,
    coolingType: 'liquid'
  },
  {
    id: 'coil-003',
    name: 'Double-Cone H-Coil',
    type: 'double-cone',
    manufacturer: 'NeuroStar',
    modelNumber: 'DC-500',
    outerDiameter: 150,
    innerDiameter: 80,
    windingTurns: 10,
    wireRadius: 3.5,
    maximumCurrent: 6000,
    efficiency: 0.65,
    coolingType: 'air'
  }
];

export const DEFAULT_PULSE_SCHEMES: Record<StimulationPattern, PulseScheme> = {
  rTMS: {
    pattern: 'rTMS',
    frequency: 10,
    intensity: 80,
    pulseDuration: 0.1,
    interTrainInterval: 60,
    trainsPerSession: 10,
    pulsesPerTrain: 500,
    sessionsPerWeek: 5,
    totalSessions: 30
  },
  iTBS: {
    pattern: 'iTBS',
    frequency: 50,
    intensity: 80,
    pulseDuration: 0.1,
    interTrainInterval: 200,
    trainsPerSession: 20,
    pulsesPerTrain: 30,
    sessionsPerWeek: 5,
    totalSessions: 30
  },
  cTBS: {
    pattern: 'cTBS',
    frequency: 50,
    intensity: 80,
    pulseDuration: 0.1,
    interTrainInterval: 200,
    trainsPerSession: 40,
    pulsesPerTrain: 30,
    sessionsPerWeek: 5,
    totalSessions: 30
  },
  paired_pulse: {
    pattern: 'paired_pulse',
    frequency: 0.1,
    intensity: 80,
    pulseDuration: 0.1,
    interTrainInterval: 300,
    trainsPerSession: 1,
    pulsesPerTrain: 100,
    sessionsPerWeek: 2,
    totalSessions: 10
  },
  theta_burst: {
    pattern: 'theta_burst',
    frequency: 5,
    intensity: 80,
    pulseDuration: 0.1,
    interTrainInterval: 60,
    trainsPerSession: 10,
    pulsesPerTrain: 200,
    sessionsPerWeek: 5,
    totalSessions: 30
  }
};

export const DEFAULT_OPTIMIZATION_CONFIG = {
  searchRadius: 20,
  gridResolution: 5,
  maxIterations: 100,
  intensityStep: 5,
  angleStep: 15,
  safetyThreshold: 100,
  focalityWeight: 0.6,
  coverageWeight: 0.3,
  safetyWeight: 0.1
};

export interface OptimizationConfig {
  searchRadius: number;
  gridResolution: number;
  maxIterations: number;
  intensityStep: number;
  angleStep: number;
  safetyThreshold: number;
  focalityWeight: number;
  coverageWeight: number;
  safetyWeight: number;
}
