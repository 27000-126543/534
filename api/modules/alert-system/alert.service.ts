import { PrismaClient } from '@prisma/client';
import {
  AlertType,
  AlertSeverity,
  RoleCode,
  AlgorithmType
} from 'shared/types/enums';
import {
  MonitoringConfig,
  RealTimeMetrics,
  AlertHandlerResult,
  AdjustmentLogEntry,
  ReviewDecision,
  AlertQueryParams,
  AlertListResponse,
  DEFAULT_MONITORING_CONFIG,
  ALERT_RESPONSE_TEMPLATES
} from './types';
import { getSourceImagingSolver } from '../source-imaging';

export class AlertService {
  private prisma: PrismaClient;
  private config: MonitoringConfig;
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();
  private realTimeMetrics: Map<string, RealTimeMetrics> = new Map();

  constructor(prisma: PrismaClient, config?: Partial<MonitoringConfig>) {
    this.prisma = prisma;
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };
  }

  public async getAlertList(params: AlertQueryParams): Promise<AlertListResponse> {
    const where: any = {};
    
    if (params.taskId) where.taskId = params.taskId;
    if (params.alertType) where.alertType = params.alertType;
    if (params.severity) where.severity = params.severity;
    if (params.status) where.status = params.status;
    if (params.startDate) where.createdAt = { gte: params.startDate };
    if (params.endDate) where.createdAt = { ...(where.createdAt || {}), lte: params.endDate };

    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [alerts, total, pendingCount, criticalCount] = await Promise.all([
      this.prisma.alert.findMany({
        where,
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
          },
          monitoringMetric: true,
          adjustmentLogs: {
            orderBy: { timestamp: 'desc' }
          },
          notifications: {
            orderBy: { sentAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.alert.count({ where }),
      this.prisma.alert.count({
        where: { ...where, status: 'pending' }
      }),
      this.prisma.alert.count({
        where: { ...where, severity: 'CRITICAL' }
      })
    ]);

    return {
      alerts,
      total,
      page,
      pageSize,
      pendingCount,
      criticalCount
    };
  }

  public async getAlert(alertId: string): Promise<any> {
    return this.prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        task: {
          select: {
            id: true,
            taskNo: true,
            status: true,
            patient: {
              select: {
                id: true,
                name: true,
                medicalRecordNo: true
              }
            },
            sourceResult: true,
            targetPlan: true
          }
        },
        monitoringMetric: true,
        adjustmentLogs: {
          include: {
            handler: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          },
          orderBy: { timestamp: 'desc' }
        },
        notifications: {
          orderBy: { sentAt: 'desc' }
        }
      }
    });
  }

  public async processAlert(
    alertId: string,
    autoProcess: boolean = true
  ): Promise<AlertHandlerResult> {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        task: {
          include: {
            sourceResult: true
          }
        }
      }
    });

    if (!alert) {
      return {
        success: false,
        adjusted: false,
        message: 'Alert not found'
      };
    }

    const template = ALERT_RESPONSE_TEMPLATES[alert.alertType as AlertType];
    
    if (!template) {
      return {
        success: false,
        adjusted: false,
        message: 'No response template for this alert type'
      };
    }

    if (!autoProcess && template.expertReviewRequired) {
      await this.notifyExperts(alertId, alert.taskId);
      return {
        success: true,
        adjusted: false,
        message: 'Alert requires expert review, notifications sent'
      };
    }

    const adjustment = template.autoAdjustments[0];
    let result: AlertHandlerResult;

    switch (adjustment.type) {
      case 'increase_regularization':
        result = await this.adjustRegularizationParam(alertId, alert);
        break;
      case 'switch_algorithm':
        result = await this.switchAlgorithm(alertId, alert);
        break;
      case 'suspend_patient':
        result = await this.suspendPatientTasks(alertId, alert);
        break;
      default:
        result = await this.applyParameterAdjustment(alertId, alert, adjustment);
    }

    if (result.adjusted && template.expertReviewRequired) {
      await this.notifyExperts(alertId, alert.taskId);
    }

    return result;
  }

  public async reviewAlert(decision: ReviewDecision): Promise<{
    success: boolean;
    message: string;
  }> {
    const alert = await this.prisma.alert.findUnique({
      where: { id: decision.alertId }
    });

    if (!alert) {
      return { success: false, message: 'Alert not found' };
    }

    const reviewer = await this.prisma.user.findUnique({
      where: { id: decision.reviewerId },
      include: { role: true }
    });

    if (!reviewer) {
      return { success: false, message: 'Reviewer not found' };
    }

    const hasPermission = [
      RoleCode.NEUROPHYSIOLOGIST,
      RoleCode.NEUROLOGY_DIRECTOR,
      RoleCode.CHIEF_SCIENTIST
    ].includes(reviewer.role.code as RoleCode);

    if (!hasPermission) {
      return { success: false, message: 'Insufficient permissions' };
    }

    const alertUpdate: any = {
      status: 'reviewed',
      reviewedBy: decision.reviewerId,
      reviewedAt: decision.reviewedAt,
      reviewComments: decision.comments
    };

    if (decision.decision === 'approve_adjustment') {
      let adjustmentResult: AlertHandlerResult;
      
      if (decision.recommendedAlgorithm) {
        adjustmentResult = await this.switchAlgorithm(
          decision.alertId,
          alert,
          decision.recommendedAlgorithm as AlgorithmType
        );
      } else if (decision.recommendedRegularization) {
        adjustmentResult = await this.adjustRegularizationParam(
          decision.alertId,
          alert,
          decision.recommendedRegularization
        );
      } else {
        adjustmentResult = await this.processAlert(decision.alertId, true);
      }

      if (adjustmentResult.adjustmentLog) {
        await this.prisma.adjustmentLog.update({
          where: { id: adjustmentResult.adjustmentLog.id },
          data: {
            approved: true,
            approvedBy: decision.reviewerId,
            approvedAt: decision.reviewedAt
          }
        });
      }

      alertUpdate.status = 'resolved';
    } else if (decision.decision === 'dismiss') {
      alertUpdate.status = 'dismissed';
    } else if (decision.decision === 'request_review') {
      alertUpdate.status = 'pending';
      await this.notifySeniorExperts(decision.alertId);
    }

    await this.prisma.alert.update({
      where: { id: decision.alertId },
      data: alertUpdate
    });

    return {
      success: true,
      message: `Alert ${decision.decision} successfully`
    };
  }

  public async startRealTimeMonitoring(taskId: string): Promise<void> {
    if (this.activeMonitors.has(taskId)) {
      return;
    }

    const interval = setInterval(
      () => this.checkTaskMetrics(taskId),
      this.config.checkInterval
    );

    this.activeMonitors.set(taskId, interval);
    await this.logMonitorEvent(taskId, 'MONITORING_STARTED', 'Real-time monitoring started');
  }

  public async stopRealTimeMonitoring(taskId: string): Promise<void> {
    const interval = this.activeMonitors.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.activeMonitors.delete(taskId);
      this.realTimeMetrics.delete(taskId);
      await this.logMonitorEvent(taskId, 'MONITORING_STOPPED', 'Real-time monitoring stopped');
    }
  }

  public async updateRealTimeMetrics(metrics: RealTimeMetrics): Promise<void> {
    this.realTimeMetrics.set(metrics.taskId, metrics);
  }

  public getRealTimeMetrics(taskId: string): RealTimeMetrics | undefined {
    return this.realTimeMetrics.get(taskId);
  }

  private async checkTaskMetrics(taskId: string): Promise<void> {
    try {
      const metrics = this.realTimeMetrics.get(taskId);
      if (!metrics) return;

      if (metrics.residualError !== undefined && 
          metrics.residualError > this.config.residualThreshold) {
        await this.triggerAlert(
          taskId,
          AlertType.RESIDUAL_EXCEEDED,
          metrics.residualError > this.config.residualThreshold * 1.5 
            ? AlertSeverity.CRITICAL 
            : AlertSeverity.ERROR,
          metrics.residualError,
          this.config.residualThreshold,
          '%',
          `拟合残差超限: ${metrics.residualError.toFixed(2)}% > ${this.config.residualThreshold}%`
        );
      }

      if (metrics.sourceOffset !== undefined && 
          metrics.sourceOffset > this.config.sourceOffsetThreshold) {
        await this.triggerAlert(
          taskId,
          AlertType.SOURCE_OFFSET_EXCEEDED,
          metrics.sourceOffset > this.config.sourceOffsetThreshold * 1.5 
            ? AlertSeverity.CRITICAL 
            : AlertSeverity.ERROR,
          metrics.sourceOffset,
          this.config.sourceOffsetThreshold,
          'mm',
          `源中心偏移超限: ${metrics.sourceOffset.toFixed(2)}mm > ${this.config.sourceOffsetThreshold}mm`
        );
      }

    } catch (error) {
      console.error('Error checking task metrics:', error);
    }
  }

  private async triggerAlert(
    taskId: string,
    alertType: AlertType,
    severity: AlertSeverity,
    actualValue: number,
    threshold: number,
    unit: string,
    description: string
  ): Promise<any> {
    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        taskId,
        alertType,
        status: { in: ['pending', 'reviewed'] }
      }
    });

    if (existingAlert) {
      await this.prisma.alert.update({
        where: { id: existingAlert.id },
        data: {
          severity,
          actualValue,
          threshold,
          description,
          updatedAt: new Date()
        }
      });
      return existingAlert;
    }

    const alert = await this.prisma.alert.create({
      data: {
        taskId,
        alertType,
        severity,
        threshold,
        actualValue,
        unit,
        description,
        suggestion: this.getSuggestionForAlert(alertType),
        status: 'pending'
      }
    });

    await this.sendNotifications(alert.id, taskId, alertType, severity);

    return alert;
  }

  private getSuggestionForAlert(alertType: AlertType): string {
    switch (alertType) {
      case AlertType.RESIDUAL_EXCEEDED:
        return '建议调整正则化参数或切换反演算法（如sLORETA → Beamforming）';
      case AlertType.SOURCE_OFFSET_EXCEEDED:
        return '建议检查数据质量或增加时间窗平滑处理';
      case AlertType.COMPUTATION_ERROR:
        return '建议降低计算复杂度或切换求解器';
      case AlertType.QUALITY_DEGRADATION:
        return '建议重新预处理EEG数据或调整滤波参数';
      case AlertType.PATIENT_DEVIATION:
        return '建议暂停患者新任务并通知首席科学家评估';
      default:
        return '请专家复核评估';
    }
  }

  private async sendNotifications(
    alertId: string,
    taskId: string,
    alertType: AlertType,
    severity: AlertSeverity
  ): Promise<void> {
    const rolesToNotify = severity === AlertSeverity.CRITICAL
      ? [RoleCode.NEUROPHYSIOLOGIST, RoleCode.NEUROLOGY_DIRECTOR, RoleCode.CHIEF_SCIENTIST]
      : [RoleCode.NEUROPHYSIOLOGIST];

    const users = await this.prisma.user.findMany({
      where: {
        role: {
          code: { in: rolesToNotify }
        }
      }
    });

    const notifications = users.map(user => ({
      alertId,
      channel: 'in_app',
      recipient: user.id,
      status: 'sent' as const,
      sentAt: new Date()
    }));

    if (notifications.length > 0) {
      await this.prisma.alertNotification.createMany({
        data: notifications
      });
    }
  }

  private async notifyExperts(alertId: string, taskId: string): Promise<void> {
    await this.sendNotifications(
      alertId,
      taskId,
      AlertType.RESIDUAL_EXCEEDED,
      AlertSeverity.ERROR
    );
  }

  private async notifySeniorExperts(alertId: string): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          code: { in: [RoleCode.NEUROLOGY_DIRECTOR, RoleCode.CHIEF_SCIENTIST] }
        }
      }
    });

    const notifications = users.map(user => ({
      alertId,
      channel: 'in_app',
      recipient: user.id,
      status: 'sent' as const,
      sentAt: new Date()
    }));

    if (notifications.length > 0) {
      await this.prisma.alertNotification.createMany({
        data: notifications
      });
    }
  }

  private async adjustRegularizationParam(
    alertId: string,
    alert: any,
    newParam?: number
  ): Promise<AlertHandlerResult> {
    const oldParam = alert.task?.sourceResult?.regularizationParam || 0.1;
    const actualNewParam = newParam || Math.min(1.0, oldParam * 2);

    const logEntry: AdjustmentLogEntry = {
      id: `adj-${Date.now()}`,
      taskId: alert.taskId,
      alertId,
      timestamp: new Date(),
      adjustmentType: 'regularization_adjustment',
      oldValue: oldParam.toString(),
      newValue: actualNewParam.toString(),
      reason: `残差超限自动调整: ${alert.description}`,
      approved: false
    };

    await this.prisma.adjustmentLog.create({
      data: {
        ...logEntry,
        timestamp: new Date()
      } as any
    });

    return {
      success: true,
      adjusted: true,
      newRegularizationParam: actualNewParam,
      adjustmentLog: logEntry,
      message: `Regularization adjusted from ${oldParam} to ${actualNewParam}`
    };
  }

  private async switchAlgorithm(
    alertId: string,
    alert: any,
    newAlgorithm?: AlgorithmType
  ): Promise<AlertHandlerResult> {
    const oldAlgorithm = alert.task?.algorithmType || AlgorithmType.SLORETA;
    const algorithms = [
      AlgorithmType.SLORETA,
      AlgorithmType.BEAMFORMING,
      AlgorithmType.LORETA,
      AlgorithmType.MNLS,
      AlgorithmType.DICS
    ];
    
    const currentIdx = algorithms.indexOf(oldAlgorithm);
    const actualNewAlgorithm = newAlgorithm || algorithms[(currentIdx + 1) % algorithms.length];

    const logEntry: AdjustmentLogEntry = {
      id: `adj-${Date.now()}`,
      taskId: alert.taskId,
      alertId,
      timestamp: new Date(),
      adjustmentType: 'algorithm_change',
      oldValue: oldAlgorithm,
      newValue: actualNewAlgorithm,
      reason: `算法切换: ${oldAlgorithm} → ${actualNewAlgorithm}`,
      approved: false
    };

    await this.prisma.adjustmentLog.create({
      data: {
        ...logEntry,
        timestamp: new Date()
      } as any
    });

    await this.prisma.task.update({
      where: { id: alert.taskId },
      data: {
        algorithmType: actualNewAlgorithm
      }
    });

    return {
      success: true,
      adjusted: true,
      newAlgorithm: actualNewAlgorithm,
      adjustmentLog: logEntry,
      message: `Algorithm switched from ${oldAlgorithm} to ${actualNewAlgorithm}`
    };
  }

  private async suspendPatientTasks(
    alertId: string,
    alert: any
  ): Promise<AlertHandlerResult> {
    const task = await this.prisma.task.findUnique({
      where: { id: alert.taskId }
    });

    if (!task) {
      return { success: false, adjusted: false, message: 'Task not found' };
    }

    const logEntry: AdjustmentLogEntry = {
      id: `adj-${Date.now()}`,
      taskId: alert.taskId,
      alertId,
      timestamp: new Date(),
      adjustmentType: 'parameter_tuning',
      oldValue: 'active',
      newValue: 'suspended',
      reason: '患者源中心偏差超限，自动暂停新任务',
      approved: false
    };

    await this.prisma.adjustmentLog.create({
      data: {
        ...logEntry,
        timestamp: new Date()
      } as any
    });

    await this.prisma.patient.update({
      where: { id: task.patientId },
      data: {
        status: 'suspended',
        suspensionReason: '连续三次定位源中心偏差超限'
      }
    });

    return {
      success: true,
      adjusted: true,
      adjustmentLog: logEntry,
      message: 'Patient tasks suspended due to deviation threshold exceeded'
    };
  }

  private async applyParameterAdjustment(
    alertId: string,
    alert: any,
    adjustment: { type: string; description: string }
  ): Promise<AlertHandlerResult> {
    const logEntry: AdjustmentLogEntry = {
      id: `adj-${Date.now()}`,
      taskId: alert.taskId,
      alertId,
      timestamp: new Date(),
      adjustmentType: 'parameter_tuning',
      oldValue: 'default',
      newValue: adjustment.type,
      reason: adjustment.description,
      approved: false
    };

    await this.prisma.adjustmentLog.create({
      data: {
        ...logEntry,
        timestamp: new Date()
      } as any
    });

    return {
      success: true,
      adjusted: true,
      adjustmentLog: logEntry,
      message: `Applied adjustment: ${adjustment.description}`
    };
  }

  private async logMonitorEvent(
    taskId: string,
    event: string,
    description: string
  ): Promise<void> {
    try {
      await this.prisma.computeLog.create({
        data: {
          taskId,
          computePhase: 'MONITORING',
          logContent: `${event}: ${description}`,
          logLevel: 'INFO'
        }
      });
    } catch (error) {
      console.error('Failed to log monitor event:', error);
    }
  }

  public async getMonitoringConfig(): Promise<MonitoringConfig> {
    const settings = await this.prisma.systemSettings.findFirst();
    
    if (settings) {
      return {
        ...this.config,
        residualThreshold: settings.residualThreshold || this.config.residualThreshold,
        sourceOffsetThreshold: settings.sourceOffsetThreshold || this.config.sourceOffsetThreshold
      };
    }
    
    return this.config;
  }

  public async updateMonitoringConfig(config: Partial<MonitoringConfig>): Promise<MonitoringConfig> {
    this.config = { ...this.config, ...config };
    
    await this.prisma.systemSettings.upsert({
      where: { id: 'default' },
      create: {
        residualThreshold: config.residualThreshold || this.config.residualThreshold,
        sourceOffsetThreshold: config.sourceOffsetThreshold || this.config.sourceOffsetThreshold
      },
      update: {
        residualThreshold: config.residualThreshold || this.config.residualThreshold,
        sourceOffsetThreshold: config.sourceOffsetThreshold || this.config.sourceOffsetThreshold
      }
    });

    return this.config;
  }

  public async getAdjustmentLogs(taskId?: string, alertId?: string): Promise<any[]> {
    const where: any = {};
    if (taskId) where.taskId = taskId;
    if (alertId) where.alertId = alertId;

    return this.prisma.adjustmentLog.findMany({
      where,
      include: {
        handler: {
          select: {
            id: true,
            name: true,
            role: {
              select: {
                code: true,
                name: true
              }
            }
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            role: {
              select: {
                code: true,
                name: true
              }
            }
          }
        },
        alert: {
          select: {
            id: true,
            alertType: true,
            severity: true,
            description: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });
  }

  public async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    const notification = await this.prisma.alertNotification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.recipient !== userId) {
      return false;
    }

    await this.prisma.alertNotification.update({
      where: { id: notificationId },
      data: {
        status: 'read',
        readAt: new Date()
      }
    });

    return true;
  }

  public async getUnreadNotificationCount(userId: string): Promise<number> {
    return this.prisma.alertNotification.count({
      where: {
        recipient: userId,
        status: 'sent'
      }
    });
  }

  public shutdown(): void {
    for (const [taskId, interval] of this.activeMonitors) {
      clearInterval(interval);
    }
    this.activeMonitors.clear();
    this.realTimeMetrics.clear();
  }
}

export default AlertService;
