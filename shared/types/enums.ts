export enum TaskStatus {
  PENDING_VALIDATION = 'pending_validation',
  VALIDATION_FAILED = 'validation_failed',
  HEAD_MODEL_BUILDING = 'head_model_building',
  HEAD_MODEL_FAILED = 'head_model_failed',
  FORWARD_COMPUTING = 'forward_computing',
  FORWARD_FAILED = 'forward_failed',
  SOURCE_INVERTING = 'source_inverting',
  SOURCE_FAILED = 'source_failed',
  TARGET_EVALUATING = 'target_evaluating',
  TARGET_FAILED = 'target_failed',
  PENDING_ENGINEER_APPROVAL = 'pending_engineer_approval',
  ENGINEER_REJECTED = 'engineer_rejected',
  PENDING_DIRECTOR_APPROVAL = 'pending_director_approval',
  DIRECTOR_REJECTED = 'director_rejected',
  PUSHING_TO_NAVIGATION = 'pushing_to_navigation',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended',
  ABNORMAL_FALLBACK = 'abnormal_fallback'
}

export enum AlgorithmType {
  SLORETA = 'sloreta',
  BEAMFORMING = 'beamforming',
  MNLS = 'mnls',
  LORETA = 'loreta',
  DICS = 'dics'
}

export enum AlertType {
  RESIDUAL_EXCEEDED = 'residual_exceeded',
  SOURCE_OFFSET_EXCEEDED = 'source_offset_exceeded',
  COMPUTATION_TIMEOUT = 'computation_timeout',
  DATA_QUALITY_ISSUE = 'data_quality_issue',
  PATIENT_DEVIATION = 'patient_deviation'
}

export enum AlertSeverity {
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum RoleCode {
  ADMIN = 'admin',
  ENGINEER = 'engineer',
  DIRECTOR = 'director',
  EXPERT = 'expert',
  CHIEF_SCIENTIST = 'chief_scientist',
  TECHNICIAN = 'technician'
}

export enum FileType {
  MRI_SEGMENTATION = 'mri_segmentation',
  ELECTRODE_POSITIONS = 'electrode_positions',
  EEG_SIGNAL = 'eeg_signal',
  HEAD_MODEL = 'head_model',
  SOURCE_RESULT = 'source_result',
  TARGET_PLAN = 'target_plan',
  REPORT_PDF = 'report_pdf'
}

export enum FrequencyBand {
  DELTA = 'delta',
  THETA = 'theta',
  ALPHA = 'alpha',
  BETA = 'beta',
  GAMMA = 'gamma'
}

export enum StimulationPattern {
  SINGLE_PULSE = 'single_pulse',
  PAIRED_PULSE = 'paired_pulse',
  TBS = 'tbs',
  RTMS = 'rtms',
  THETA_BURST = 'theta_burst'
}

export enum BrainRegion {
  PREFRONTAL = 'prefrontal',
  MOTOR = 'motor',
  PARIETAL = 'parietal',
  TEMPORAL = 'temporal',
  OCCIPITAL = 'occipital',
  CEREBELLUM = 'cerebellum',
  LEFT_DLPFC = 'left_dlpfc',
  RIGHT_DLPFC = 'right_dlpfc',
  M1 = 'm1',
  SMA = 'sma'
}

export const TaskStatusText: Record<TaskStatus, string> = {
  [TaskStatus.PENDING_VALIDATION]: '待校验',
  [TaskStatus.VALIDATION_FAILED]: '校验失败',
  [TaskStatus.HEAD_MODEL_BUILDING]: '头模型构建中',
  [TaskStatus.HEAD_MODEL_FAILED]: '头模型构建失败',
  [TaskStatus.FORWARD_COMPUTING]: '正问题计算中',
  [TaskStatus.FORWARD_FAILED]: '正问题计算失败',
  [TaskStatus.SOURCE_INVERTING]: '源反演计算中',
  [TaskStatus.SOURCE_FAILED]: '源反演计算失败',
  [TaskStatus.TARGET_EVALUATING]: '靶点评估中',
  [TaskStatus.TARGET_FAILED]: '靶点评估失败',
  [TaskStatus.PENDING_ENGINEER_APPROVAL]: '待工程师审批',
  [TaskStatus.ENGINEER_REJECTED]: '工程师已驳回',
  [TaskStatus.PENDING_DIRECTOR_APPROVAL]: '待主任审批',
  [TaskStatus.DIRECTOR_REJECTED]: '主任已驳回',
  [TaskStatus.PUSHING_TO_NAVIGATION]: '推送导航系统中',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.SUSPENDED]: '已暂停',
  [TaskStatus.ABNORMAL_FALLBACK]: '异常回退'
}

export const AlgorithmTypeText: Record<AlgorithmType, string> = {
  [AlgorithmType.SLORETA]: 'sLORETA',
  [AlgorithmType.BEAMFORMING]: 'Beamforming',
  [AlgorithmType.MNLS]: 'MNLS',
  [AlgorithmType.LORETA]: 'LORETA',
  [AlgorithmType.DICS]: 'DICS'
}

export const AlertTypeText: Record<AlertType, string> = {
  [AlertType.RESIDUAL_EXCEEDED]: '拟合残差超限',
  [AlertType.SOURCE_OFFSET_EXCEEDED]: '源中心偏移超限',
  [AlertType.COMPUTATION_TIMEOUT]: '计算超时',
  [AlertType.DATA_QUALITY_ISSUE]: '数据质量问题',
  [AlertType.PATIENT_DEVIATION]: '患者偏差异常'
}

export const AlertSeverityText: Record<AlertSeverity, string> = {
  [AlertSeverity.WARNING]: '警告',
  [AlertSeverity.ERROR]: '错误',
  [AlertSeverity.CRITICAL]: '严重'
}

export const ApprovalStatusText: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: '待审批',
  [ApprovalStatus.APPROVED]: '已通过',
  [ApprovalStatus.REJECTED]: '已驳回'
}

export const RoleCodeText: Record<RoleCode, string> = {
  [RoleCode.ADMIN]: '系统管理员',
  [RoleCode.ENGINEER]: '临床工程师',
  [RoleCode.DIRECTOR]: '神经内科主任',
  [RoleCode.EXPERT]: '神经电生理专家',
  [RoleCode.CHIEF_SCIENTIST]: '首席科学家',
  [RoleCode.TECHNICIAN]: '实验室技术员'
}

export const FileTypeText: Record<FileType, string> = {
  [FileType.MRI_SEGMENTATION]: 'MRI分割模型',
  [FileType.ELECTRODE_POSITIONS]: '电极位置文件',
  [FileType.EEG_SIGNAL]: '脑电信号文件',
  [FileType.HEAD_MODEL]: '头模型文件',
  [FileType.SOURCE_RESULT]: '源定位结果',
  [FileType.TARGET_PLAN]: '靶点方案',
  [FileType.REPORT_PDF]: 'PDF报告'
}

export const FrequencyBandText: Record<FrequencyBand, string> = {
  [FrequencyBand.DELTA]: 'Delta (1-4Hz)',
  [FrequencyBand.THETA]: 'Theta (4-8Hz)',
  [FrequencyBand.ALPHA]: 'Alpha (8-13Hz)',
  [FrequencyBand.BETA]: 'Beta (13-30Hz)',
  [FrequencyBand.GAMMA]: 'Gamma (30-100Hz)'
}

export const StimulationPatternText: Record<StimulationPattern, string> = {
  [StimulationPattern.SINGLE_PULSE]: '单脉冲',
  [StimulationPattern.PAIRED_PULSE]: '双脉冲',
  [StimulationPattern.TBS]: 'θ爆发刺激',
  [StimulationPattern.RTMS]: '重复经颅磁刺激',
  [StimulationPattern.THETA_BURST]: 'θ节律刺激'
}

export const BrainRegionText: Record<BrainRegion, string> = {
  [BrainRegion.PREFRONTAL]: '前额叶',
  [BrainRegion.MOTOR]: '运动皮层',
  [BrainRegion.PARIETAL]: '顶叶',
  [BrainRegion.TEMPORAL]: '颞叶',
  [BrainRegion.OCCIPITAL]: '枕叶',
  [BrainRegion.CEREBELLUM]: '小脑',
  [BrainRegion.LEFT_DLPFC]: '左侧背外侧前额叶',
  [BrainRegion.RIGHT_DLPFC]: '右侧背外侧前额叶',
  [BrainRegion.M1]: '初级运动皮层',
  [BrainRegion.SMA]: '辅助运动区'
}

export const TaskStatusColor: Record<TaskStatus, string> = {
  [TaskStatus.PENDING_VALIDATION]: '#FF9800',
  [TaskStatus.VALIDATION_FAILED]: '#EF5350',
  [TaskStatus.HEAD_MODEL_BUILDING]: '#42A5F5',
  [TaskStatus.HEAD_MODEL_FAILED]: '#EF5350',
  [TaskStatus.FORWARD_COMPUTING]: '#42A5F5',
  [TaskStatus.FORWARD_FAILED]: '#EF5350',
  [TaskStatus.SOURCE_INVERTING]: '#42A5F5',
  [TaskStatus.SOURCE_FAILED]: '#EF5350',
  [TaskStatus.TARGET_EVALUATING]: '#42A5F5',
  [TaskStatus.TARGET_FAILED]: '#EF5350',
  [TaskStatus.PENDING_ENGINEER_APPROVAL]: '#FF9800',
  [TaskStatus.ENGINEER_REJECTED]: '#EF5350',
  [TaskStatus.PENDING_DIRECTOR_APPROVAL]: '#FF9800',
  [TaskStatus.DIRECTOR_REJECTED]: '#EF5350',
  [TaskStatus.PUSHING_TO_NAVIGATION]: '#7E57C2',
  [TaskStatus.COMPLETED]: '#26A69A',
  [TaskStatus.SUSPENDED]: '#78909C',
  [TaskStatus.ABNORMAL_FALLBACK]: '#EF5350'
}

export const AlertSeverityColor: Record<AlertSeverity, string> = {
  [AlertSeverity.WARNING]: '#FF9800',
  [AlertSeverity.ERROR]: '#EF5350',
  [AlertSeverity.CRITICAL]: '#D32F2F'
}
