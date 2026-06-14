import { AlertType, AlertSeverity, RoleCode } from '../../../../shared/types/enums';

export interface AlertThreshold {
  alertType: AlertType;
  warningThreshold: number;
  criticalThreshold: number;
  enabled: boolean;
  notificationChannels: NotificationChannel[];
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'in_app' | 'websocket';
  enabled: boolean;
  template?: string;
}

export interface MonitoringConfig {
  checkInterval: number;
  residualThreshold: number;
  sourceOffsetThreshold: number;
  consecutiveAlertThreshold: number;
  autoPauseOnCritical: boolean;
  alertThresholds: AlertThreshold[];
}

export interface RealTimeMetrics {
  taskId: string;
  timestamp: number;
  currentStatus: string;
  progress: number;
  residualError?: number;
  sourceOffset?: number;
  sourceCenter?: [number, number, number];
  currentWindow?: number;
  totalWindows?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  processingSpeed?: number;
}

export interface AlertHandlerResult {
  success: boolean;
  adjusted: boolean;
  newAlgorithm?: string;
  newRegularizationParam?: number;
  adjustmentLog?: AdjustmentLogEntry;
  message?: string;
}

export interface AdjustmentLogEntry {
  id: string;
  taskId: string;
  alertId: string;
  timestamp: Date;
  handlerUserId?: string;
  adjustmentType: 'algorithm_change' | 'regularization_adjustment' | 'parameter_tuning' | 'data_reprocessing';
  oldValue: string;
  newValue: string;
  reason: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  channel: string;
  recipient: string;
  sentAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'read';
  readAt?: Date;
}

export interface ReviewDecision {
  alertId: string;
  reviewerId: string;
  decision: 'approve_adjustment' | 'request_review' | 'override' | 'dismiss';
  comments: string;
  recommendedAlgorithm?: string;
  recommendedRegularization?: number;
  reviewedAt: Date;
}

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  checkInterval: 1000,
  residualThreshold: 10,
  sourceOffsetThreshold: 5,
  consecutiveAlertThreshold: 2,
  autoPauseOnCritical: true,
  alertThresholds: [
    {
      alertType: AlertType.RESIDUAL_EXCEEDED,
      warningThreshold: 8,
      criticalThreshold: 15,
      enabled: true,
      notificationChannels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true }
      ]
    },
    {
      alertType: AlertType.SOURCE_OFFSET_EXCEEDED,
      warningThreshold: 4,
      criticalThreshold: 8,
      enabled: true,
      notificationChannels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true }
      ]
    },
    {
      alertType: AlertType.COMPUTATION_ERROR,
      warningThreshold: 1,
      criticalThreshold: 3,
      enabled: true,
      notificationChannels: [
        { type: 'in_app', enabled: true },
        { type: 'sms', enabled: true }
      ]
    },
    {
      alertType: AlertType.QUALITY_DEGRADATION,
      warningThreshold: 0.7,
      criticalThreshold: 0.5,
      enabled: true,
      notificationChannels: [
        { type: 'in_app', enabled: true }
      ]
    },
    {
      alertType: AlertType.PATIENT_DEVIATION,
      warningThreshold: 6,
      criticalThreshold: 10,
      enabled: true,
      notificationChannels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true },
        { type: 'sms', enabled: true }
      ]
    }
  ]
};

export const ALERT_RESPONSE_TEMPLATES: Record<AlertType, {
  autoAdjustments: { type: string; description: string }[];
  expertReviewRequired: boolean;
}> = {
  [AlertType.RESIDUAL_EXCEEDED]: {
    autoAdjustments: [
      { type: 'increase_regularization', description: '增加正则化参数 0.1 → 0.5' },
      { type: 'switch_algorithm', description: '切换算法: sLORETA → Beamforming' },
      { type: 'increase_window', description: '增加时间窗: 100ms → 200ms' }
    ],
    expertReviewRequired: true
  },
  [AlertType.SOURCE_OFFSET_EXCEEDED]: {
    autoAdjustments: [
      { type: 'increase_smoothing', description: '增加平滑处理' },
      { type: 'filter_outliers', description: '过滤异常时间窗' },
      { type: 'increase_window_overlap', description: '增加时间窗重叠: 50% → 75%' }
    ],
    expertReviewRequired: true
  },
  [AlertType.COMPUTATION_ERROR]: {
    autoAdjustments: [
      { type: 'reduce_grid_resolution', description: '降低网格分辨率' },
      { type: 'switch_solver', description: '切换求解器' }
    ],
    expertReviewRequired: true
  },
  [AlertType.QUALITY_DEGRADATION]: {
    autoAdjustments: [
      { type: 'reprocess_data', description: '重新预处理EEG数据' },
      { type: 'increase_bandpass', description: '调整带通滤波范围' }
    ],
    expertReviewRequired: false
  },
  [AlertType.PATIENT_DEVIATION]: {
    autoAdjustments: [
      { type: 'suspend_patient', description: '暂停患者新任务' },
      { type: 'notify_chief_scientist', description: '通知首席科学家' }
    ],
    expertReviewRequired: true
  }
};

export interface AlertQueryParams {
  taskId?: string;
  alertType?: AlertType;
  severity?: AlertSeverity;
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface AlertListResponse {
  alerts: any[];
  total: number;
  page: number;
  pageSize: number;
  pendingCount: number;
  criticalCount: number;
}
