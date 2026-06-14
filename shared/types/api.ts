import {
  TaskStatus,
  AlgorithmType,
  AlertType,
  AlertSeverity,
  ApprovalStatus,
  RoleCode,
  FileType,
  FrequencyBand,
  StimulationPattern,
  BrainRegion
} from './enums';

export interface UserSummary {
  id: string;
  username: string;
  fullName: string;
  title: string;
  roleCode: RoleCode;
  roleName: string;
}

export interface PatientSummary {
  id: string;
  medicalRecordNo: string;
  name: string;
  gender: string;
  age: number;
  diagnosis: string;
  isSuspended: boolean;
}

export interface FrequencyBands {
  delta?: [number, number];
  theta?: [number, number];
  alpha?: [number, number];
  beta?: [number, number];
  gamma?: [number, number];
}

export interface AlgorithmParams {
  regularizationParam?: number;
  frequencyBands?: FrequencyBands;
  timeWindow?: number;
  overlap?: number;
  maxIterations?: number;
  convergenceThreshold?: number;
}

export interface CreateTaskRequest {
  patientId: string;
  taskName: string;
  algorithmType: AlgorithmType;
  algorithmParams: AlgorithmParams;
  targetBrainRegion?: BrainRegion;
  notes?: string;
}

export interface TaskSummary {
  id: string;
  taskNo: string;
  patient: PatientSummary;
  createdBy: UserSummary;
  status: TaskStatus;
  statusText: string;
  algorithmType: AlgorithmType;
  algorithmTypeText: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStatusEvent {
  id: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  toStatusText: string;
  reason: string | null;
  operator: UserSummary | null;
  createdAt: string;
}

export interface HeadModelData {
  id: string;
  scalpMesh: {
    vertices: number[][];
    faces: number[][];
  };
  skullMesh: {
    vertices: number[][];
    faces: number[][];
  };
  brainMesh: {
    vertices: number[][];
    faces: number[][];
    regionLabels?: { [vertexId: number]: string };
  };
  conductivityParams: {
    scalp: number;
    skull: number;
    brain: number;
    unit: string;
  };
  meshQuality: number;
  triangleCount: number;
  createdAt: string;
}

export interface ForwardResultData {
  id: string;
  leadfieldMatrix: {
    channels: string[];
    sources: number[][];
    matrix: number[][];
  };
  solutionMethod: string;
  computationTime: number;
  createdAt: string;
}

export interface CurrentDensityData {
  vertices: number[][];
  values: number[];
  timePoints: number[];
  unit: string;
}

export interface SourceTimeSeriesData {
  labels: string[];
  regions: string[];
  data: number[][];
  timePoints: number[];
  unit: string;
  samplingRate: number;
}

export interface DipoleParameters {
  position: [number, number, number];
  moment: [number, number, number];
  goodnessOfFit: number;
  residualError: number;
}

export interface ConfidenceEllipsoid {
  center: [number, number, number];
  radii: [number, number, number];
  rotation: number[][];
  confidenceLevel: number;
  unit: string;
}

export interface MonitoringMetric {
  id: string;
  timeWindow: number;
  timeRange: [number, number];
  residualError: number;
  sourceCenter: [number, number, number];
  offsetFromPrevious: number;
  isAlertTriggered: boolean;
  alertType?: AlertType;
  createdAt: string;
}

export interface SourceResultData {
  id: string;
  algorithmUsed: AlgorithmType;
  algorithmUsedText: string;
  currentDensity: CurrentDensityData;
  sourceTimeSeries: SourceTimeSeriesData;
  dipoleParameters: DipoleParameters;
  confidenceEllipsoid: ConfidenceEllipsoid;
  meanResidual: number;
  sourceSpatialAccuracy: number;
  regularizationParam: number;
  monitoringMetrics: MonitoringMetric[];
  createdAt: string;
}

export interface CoilOrientation {
  normal: [number, number, number];
  handleDirection: [number, number, number];
  angleDegrees: number;
}

export interface AlternativePlan {
  id: string;
  coilPosition: [number, number, number];
  coilOrientation: CoilOrientation;
  currentIntensity: number;
  focalityIndex: number;
  targetCoverage: number;
  tradeOffReason: string;
}

export interface AIRecommendationParams {
  modelVersion: string;
  confidence: number;
  historicalSimilarity: number;
  features: {
    name: string;
    importance: number;
    value: number;
  }[];
}

export interface TargetPlanData {
  id: string;
  coilPosition: [number, number, number];
  coilOrientation: CoilOrientation;
  currentIntensity: number;
  pulseCount: number;
  pulsePattern: StimulationPattern;
  pulsePatternText: string;
  focalityIndex: number;
  targetCoverage: number;
  stimulationVolume: number;
  targetRegion: BrainRegion;
  targetRegionText: string;
  isAIRecommended: boolean;
  aiRecommendationParams?: AIRecommendationParams;
  alternativePlans: AlternativePlan[];
  createdAt: string;
}

export interface AlertReviewData {
  id: string;
  reviewer: UserSummary;
  approved: boolean;
  reviewComment: string;
  adjustmentType: 'parameter' | 'algorithm' | 'both' | 'none';
  newParams?: AlgorithmParams;
  newAlgorithm?: AlgorithmType;
  createdAt: string;
}

export interface AlertData {
  id: string;
  taskId: string;
  taskNo: string;
  patientName: string;
  alertType: AlertType;
  alertTypeText: string;
  severity: AlertSeverity;
  severityText: string;
  threshold: number;
  actualValue: number;
  unit: string;
  description: string;
  suggestion: string;
  isResolved: boolean;
  review?: AlertReviewData;
  monitoringMetricId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ApprovalRecord {
  id: string;
  taskId: string;
  approvalLevel: 1 | 2;
  approvalLevelText: string;
  approver: UserSummary | null;
  status: ApprovalStatus;
  statusText: string;
  comment: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface TaskDetailResponse {
  id: string;
  taskNo: string;
  taskName: string;
  patient: PatientSummary;
  createdBy: UserSummary;
  status: TaskStatus;
  statusText: string;
  algorithmType: AlgorithmType;
  algorithmTypeText: string;
  algorithmParams: AlgorithmParams;
  targetBrainRegion?: BrainRegion;
  targetBrainRegionText?: string;
  currentPhase: string;
  progress: number;
  notes?: string;
  headModel?: HeadModelData;
  forwardResult?: ForwardResultData;
  sourceResult?: SourceResultData;
  targetPlan?: TargetPlanData;
  timeline: TaskStatusEvent[];
  approvals: ApprovalRecord[];
  alerts: AlertData[];
  pushToNavigation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalActionRequest {
  taskId: string;
  approvalId: string;
  approved: boolean;
  comment: string;
}

export interface AlertReviewRequest {
  alertId: string;
  approved: boolean;
  reviewComment: string;
  adjustmentType: 'parameter' | 'algorithm' | 'both' | 'none';
  newParams?: AlgorithmParams;
  newAlgorithm?: AlgorithmType;
}

export interface RecomputeRequest {
  taskId: string;
  algorithmType?: AlgorithmType;
  algorithmParams?: AlgorithmParams;
  reason: string;
}

export interface AIRecommendationRequest {
  taskId: string;
  targetRegion: BrainRegion;
  constraints?: {
    maxCurrent?: number;
    preferredPattern?: StimulationPattern;
    avoidRegions?: BrainRegion[];
  };
}

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  avgAccuracy: number;
  avgCoverage: number;
  alertCount: number;
  pendingApprovals: number;
  avgComputationTime: number;
}

export interface AnalyticsTrends {
  dates: string[];
  taskCounts: number[];
  completedCounts: number[];
  accuracyTrend: number[];
  coverageTrend: number[];
  alertTrend: number[];
}

export interface RadarData {
  categories: string[];
  current: number[];
  target: number[];
}

export interface TaskDistribution {
  statuses: string[];
  counts: number[];
  colors: string[];
}

export interface RegionPerformance {
  regions: string[];
  accuracy: number[];
  coverage: number[];
  taskCount: number[];
}

export interface AlgorithmPerformance {
  algorithms: string[];
  accuracy: number[];
  speed: number[];
  usageCount: number[];
}

export interface AnalyticsDashboardData {
  summary: AnalyticsSummary;
  trends: AnalyticsTrends;
  radar: RadarData;
  taskDistribution: TaskDistribution;
  regionPerformance: RegionPerformance;
  algorithmPerformance: AlgorithmPerformance;
  lastUpdated: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TwoFactorRequest {
  token: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
  requiresTwoFactor: boolean;
}

export interface FileUploadResponse {
  id: string;
  fileType: FileType;
  fileName: string;
  fileSize: number;
  fileHash: string;
  isValid: boolean;
  validationError?: string;
  uploadUrl?: string;
}

export interface ExportRequest {
  taskId: string;
  exportType: 'source_data' | 'target_coords' | 'full_report';
  format: 'csv' | 'json' | 'nifti' | 'mat';
  filters?: {
    brainRegions?: BrainRegion[];
    frequencyBands?: FrequencyBand[];
    stimulationPatterns?: StimulationPattern[];
    timeRange?: [number, number];
  };
}

export interface ExportResponse {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  expiresAt: string;
}

export interface DailyStatsData {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  avgAccuracy: number;
  avgCoverage: number;
  alertCount: number;
  detailedStats: {
    byAlgorithm: { [key: string]: { tasks: number; accuracy: number } };
    byRegion: { [key: string]: { tasks: number; coverage: number } };
    alertsByType: { [key: string]: number };
  };
}

export interface PatientSuspendRequest {
  patientId: string;
  reason: string;
  triggeredByTaskId: string;
  deviationMm: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  title: string;
  roleCode: RoleCode;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  title?: string;
  roleCode?: RoleCode;
  isActive?: boolean;
}

export interface AlgorithmConfigData {
  id: string;
  algorithmName: AlgorithmType;
  algorithmNameText: string;
  defaultParams: AlgorithmParams;
  paramRanges: {
    [key: string]: {
      min: number;
      max: number;
      step: number;
      default: number;
    };
  };
  isEnabled: boolean;
  description: string;
  updatedAt: string;
}

export interface AlertThresholdConfig {
  id: string;
  alertType: AlertType;
  alertTypeText: string;
  severity: AlertSeverity;
  threshold: number;
  unit: string;
  enabled: boolean;
  notificationChannels: ('email' | 'sms' | 'inapp')[];
}

export interface SystemSettings {
  alertThresholds: AlertThresholdConfig[];
  algorithmConfigs: AlgorithmConfigData[];
  patientDeviationThreshold: number;
  consecutiveDeviationCount: number;
  autoSuspendEnabled: boolean;
  navigationSystemUrl: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskFilterParams {
  status?: TaskStatus[];
  patientId?: string;
  algorithmType?: AlgorithmType[];
  createdBy?: string;
  dateRange?: [string, string];
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
