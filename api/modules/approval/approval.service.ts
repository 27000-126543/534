import { PrismaClient } from '@prisma/client';
import {
  RoleCode,
  ApprovalStatus,
  TaskStatus
} from '../../../../shared/types/enums';
import {
  ApprovalFlowConfig,
  ApprovalDecision,
  Permission,
  DEFAULT_APPROVAL_FLOWS,
  ROLE_PERMISSIONS,
  DEFAULT_NAVIGATION_SYSTEM_CONFIG,
  NavigationSystemResponse,
  ApprovalQueryParams,
  ApprovalListResponse
} from './types';

export class ApprovalService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public checkPermission(
    roleCode: RoleCode,
    resource: string,
    action: Permission['action']
  ): boolean {
    const rolePermissions = ROLE_PERMISSIONS[roleCode];
    if (!rolePermissions) return false;

    return rolePermissions.some(p => 
      (p.resource === 'all' || p.resource === resource) &&
      (p.action === action)
    );
  }

  public async submitForApproval(
    taskId: string,
    type: 'source_validation' | 'treatment_confirmation',
    submittedBy: string,
    comments?: string
  ): Promise<{
    success: boolean;
    approvalRequestId?: string;
    message?: string;
  }> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        sourceResult: true,
        targetPlan: true,
        patient: true
      }
    });

    if (!task) {
      return { success: false, message: 'Task not found' };
    }

    const submitter = await this.prisma.user.findUnique({
      where: { id: submittedBy },
      include: { role: true }
    });

    if (!submitter) {
      return { success: false, message: 'Submitter not found' };
    }

    const submitterRole = submitter.role.code as RoleCode;
    const requiredPermission = type === 'source_validation' ? 'source_result' : 'target_plan';
    
    if (!this.checkPermission(submitterRole, requiredPermission, 'submit')) {
      return { success: false, message: 'Insufficient permissions to submit for approval' };
    }

    const flowConfig = DEFAULT_APPROVAL_FLOWS[type];
    
    const existingRequest = await this.prisma.approvalRequest.findFirst({
      where: {
        taskId,
        type,
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.IN_PROGRESS] }
      }
    });

    if (existingRequest) {
      return { 
        success: false, 
        message: 'An approval request is already in progress for this task' 
      };
    }

    const approvalRequest = await this.prisma.approvalRequest.create({
      data: {
        taskId,
        type,
        status: ApprovalStatus.PENDING,
        currentStage: 1,
        totalStages: flowConfig.stages.length,
        submittedBy,
        comments
      }
    });

    await this.notifyApprovers(taskId, approvalRequest.id, 1, flowConfig);

    const newTaskStatus = type === 'source_validation' 
      ? TaskStatus.PENDING_ENGINEER_APPROVAL
      : TaskStatus.PENDING_DIRECTOR_APPROVAL;

    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: newTaskStatus }
    });

    await this.logApprovalEvent(
      taskId,
      `提交${type === 'source_validation' ? '源定位' : '治疗方案'}审批`,
      submittedBy
    );

    return {
      success: true,
      approvalRequestId: approvalRequest.id,
      message: 'Approval request submitted successfully'
    };
  }

  public async processApproval(
    approvalRequestId: string,
    approverId: string,
    decision: 'approve' | 'reject' | 'request_changes' | 'escalate',
    comments: string,
    attachments?: string[]
  ): Promise<{
    success: boolean;
    message: string;
    newStatus?: ApprovalStatus;
    nextStage?: number;
  }> {
    const approvalRequest = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: {
        task: true,
        approvals: {
          orderBy: { decidedAt: 'desc' }
        }
      }
    });

    if (!approvalRequest) {
      return { success: false, message: 'Approval request not found' };
    }

    if (approvalRequest.status !== ApprovalStatus.PENDING && 
        approvalRequest.status !== ApprovalStatus.IN_PROGRESS) {
      return { success: false, message: 'Approval request is not in a pending state' };
    }

    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
      include: { role: true }
    });

    if (!approver) {
      return { success: false, message: 'Approver not found' };
    }

    const flowConfig = DEFAULT_APPROVAL_FLOWS[approvalRequest.type];
    const currentStageConfig = flowConfig.stages.find(
      s => s.order === approvalRequest.currentStage
    );

    if (!currentStageConfig) {
      return { success: false, message: 'Invalid approval stage' };
    }

    const approverRole = approver.role.code as RoleCode;
    const canApprove = currentStageConfig.requiredRoles.includes(approverRole);
    
    if (!canApprove) {
      return { success: false, message: 'Insufficient permissions for this approval stage' };
    }

    const existingApproval = approvalRequest.approvals.find(
      a => a.approverId === approverId && a.stage === approvalRequest.currentStage
    );

    if (existingApproval) {
      return { success: false, message: 'You have already processed this approval stage' };
    }

    const approvalDecision = await this.prisma.approvalDecision.create({
      data: {
        approvalRequestId,
        stage: approvalRequest.currentStage,
        approverId,
        decision,
        comments,
        attachments
      }
    });

    await this.logApprovalEvent(
      approvalRequest.taskId,
      `${decision === 'approve' ? '批准' : decision === 'reject' ? '拒绝' : decision === 'request_changes' ? '要求修改' : '升级'}审批: ${comments}`,
      approverId
    );

    if (decision === 'reject') {
      await this.updateApprovalRequestStatus(approvalRequestId, ApprovalStatus.REJECTED);
      return { success: true, message: 'Approval rejected', newStatus: ApprovalStatus.REJECTED };
    }

    if (decision === 'request_changes') {
      await this.updateApprovalRequestStatus(approvalRequestId, ApprovalStatus.CHANGES_REQUESTED);
      return { success: true, message: 'Changes requested', newStatus: ApprovalStatus.CHANGES_REQUESTED };
    }

    if (decision === 'escalate') {
      if (currentStageConfig.escalationRole) {
        await this.notifyEscalation(approvalRequestId, currentStageConfig.escalationRole);
      }
      return { success: true, message: 'Approval escalated' };
    }

    const stageApprovals = await this.prisma.approvalDecision.count({
      where: {
        approvalRequestId,
        stage: approvalRequest.currentStage,
        decision: 'approve'
      }
    });

    if (stageApprovals < currentStageConfig.minApprovers) {
      return { 
        success: true, 
        message: 'Approval recorded, waiting for more approvers',
        newStatus: ApprovalStatus.IN_PROGRESS
      };
    }

    const nextStage = approvalRequest.currentStage + 1;
    
    if (nextStage > flowConfig.stages.length) {
      await this.completeApproval(approvalRequestId, approvalRequest.taskId, approvalRequest.type);
      return { 
        success: true, 
        message: 'All approval stages completed',
        newStatus: ApprovalStatus.APPROVED
      };
    }

    await this.prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        currentStage: nextStage,
        status: ApprovalStatus.IN_PROGRESS
      }
    });

    await this.notifyApprovers(approvalRequest.taskId, approvalRequestId, nextStage, flowConfig);

    const newTaskStatus = nextStage === 2 
      ? TaskStatus.PENDING_DIRECTOR_APPROVAL
      : TaskStatus.PENDING_ENGINEER_APPROVAL;

    await this.prisma.task.update({
      where: { id: approvalRequest.taskId },
      data: { status: newTaskStatus }
    });

    return {
      success: true,
      message: `Stage ${approvalRequest.currentStage} approved, moving to stage ${nextStage}`,
      newStatus: ApprovalStatus.IN_PROGRESS,
      nextStage
    };
  }

  private async updateApprovalRequestStatus(
    approvalRequestId: string,
    status: ApprovalStatus
  ): Promise<void> {
    await this.prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status,
        completedAt: status === ApprovalStatus.APPROVED || status === ApprovalStatus.REJECTED 
          ? new Date() 
          : undefined
      }
    });
  }

  private async completeApproval(
    approvalRequestId: string,
    taskId: string,
    type: string
  ): Promise<void> {
    await this.updateApprovalRequestStatus(approvalRequestId, ApprovalStatus.APPROVED);

    let newTaskStatus: TaskStatus;
    
    if (type === 'source_validation') {
      newTaskStatus = TaskStatus.TARGET_EVALUATION;
    } else {
      newTaskStatus = TaskStatus.READY_FOR_STIMULATION;
      await this.pushToNavigationSystem(taskId);
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: newTaskStatus }
    });
  }

  private async notifyApprovers(
    taskId: string,
    approvalRequestId: string,
    stage: number,
    flowConfig: ApprovalFlowConfig
  ): Promise<void> {
    const stageConfig = flowConfig.stages.find(s => s.order === stage);
    if (!stageConfig) return;

    const approvers = await this.prisma.user.findMany({
      where: {
        role: {
          code: { in: stageConfig.requiredRoles }
        }
      }
    });

    const notifications = approvers.map(approver => ({
      type: 'approval_request' as const,
      recipient: approver.id,
      content: `任务 ${taskId} 需要您的${stageConfig.name}审批`,
      relatedId: approvalRequestId,
      status: 'sent' as const,
      sentAt: new Date()
    }));

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({
        data: notifications
      });
    }
  }

  private async notifyEscalation(
    approvalRequestId: string,
    escalationRole: RoleCode
  ): Promise<void> {
    const escalationUsers = await this.prisma.user.findMany({
      where: {
        role: {
          code: escalationRole
        }
      }
    });

    const notifications = escalationUsers.map(user => ({
      type: 'approval_escalation' as const,
      recipient: user.id,
      content: `审批请求 ${approvalRequestId} 已升级，需要您的关注`,
      relatedId: approvalRequestId,
      status: 'sent' as const,
      sentAt: new Date()
    }));

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({
        data: notifications
      });
    }
  }

  public async pushToNavigationSystem(taskId: string): Promise<NavigationSystemResponse> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        patient: true,
        targetPlan: true,
        sourceResult: true
      }
    });

    if (!task || !task.targetPlan) {
      return { success: false, message: 'Task or target plan not found' };
    }

    const targetPlan = task.targetPlan as any;
    const stimulationParams = {
      taskId,
      taskNo: task.taskNo,
      patient: {
        id: task.patient.id,
        name: task.patient.name,
        medicalRecordNo: task.patient.medicalRecordNo
      },
      target: targetPlan.target,
      coilPlacement: targetPlan.optimalPlacement,
      coilModel: targetPlan.coilModel,
      stimulation: {
        intensity: targetPlan.optimizationResult.stimulationIntensity,
        frequency: targetPlan.optimizationResult.pulseFrequency,
        pulseDuration: targetPlan.optimizationResult.pulseDuration,
        totalPulses: targetPlan.optimizationResult.totalPulses,
        estimatedDuration: targetPlan.optimizationResult.estimatedDuration
      },
      recommendation: targetPlan.recommendation,
      sourceResult: task.sourceResult ? {
        meanResidual: task.sourceResult.meanResidual,
        sourceSpatialAccuracy: task.sourceResult.sourceSpatialAccuracy,
        dipolePosition: task.sourceResult.dipoleParameters?.position
      } : null,
      sentAt: new Date().toISOString()
    };

    try {
      const navigationResponse = await this.simulateNavigationApiCall(stimulationParams);

      if (navigationResponse.success && navigationResponse.navigationId) {
        await this.prisma.task.update({
          where: { id: taskId },
          data: {
            navigationSystemId: navigationResponse.navigationId,
            navigationSystemStatus: 'pushed'
          }
        });

        await this.logApprovalEvent(
          taskId,
          `刺激参数已推送至导航系统，ID: ${navigationResponse.navigationId}`,
          'system'
        );
      }

      return navigationResponse;
    } catch (error) {
      await this.logApprovalEvent(
        taskId,
        `推送导航系统失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'system'
      );

      return {
        success: false,
        message: `Failed to push to navigation system: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async simulateNavigationApiCall(params: any): Promise<NavigationSystemResponse> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      navigationId: `NAV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      status: 'received',
      message: 'Stimulation parameters received successfully',
      stimulationParams: params
    };
  }

  public async getApprovalList(
    params: ApprovalQueryParams,
    currentUserId?: string
  ): Promise<ApprovalListResponse> {
    const where: any = {};
    
    if (params.taskId) where.taskId = params.taskId;
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.stage) where.currentStage = params.stage;
    if (params.submittedBy) where.submittedBy = params.submittedBy;
    if (params.startDate) where.submittedAt = { gte: params.startDate };
    if (params.endDate) where.submittedAt = { ...(where.submittedAt || {}), lte: params.endDate };

    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [requests, total, pendingMyApproval, completedToday] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where,
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
              }
            }
          },
          submitter: {
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
          approvals: {
            include: {
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
              }
            },
            orderBy: { decidedAt: 'desc' }
          }
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.approvalRequest.count({ where }),
      currentUserId ? this.getPendingApprovalCount(currentUserId) : 0,
      this.getCompletedTodayCount()
    ]);

    return {
      requests,
      total,
      page,
      pageSize,
      pendingMyApproval,
      completedToday
    };
  }

  public async getApproval(approvalRequestId: string): Promise<any> {
    return this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: {
        task: {
          include: {
            patient: true,
            sourceResult: true,
            targetPlan: true
          }
        },
        submitter: {
          include: { role: true }
        },
        approvals: {
          include: {
            approver: {
              include: { role: true }
            }
          },
          orderBy: { decidedAt: 'asc' }
        }
      }
    });
  }

  private async getPendingApprovalCount(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user) return 0;

    const userRole = user.role.code as RoleCode;
    const pendingRequests = await this.prisma.approvalRequest.findMany({
      where: {
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.IN_PROGRESS] }
      },
      include: { approvals: true }
    });

    let count = 0;
    for (const request of pendingRequests) {
      const flowConfig = DEFAULT_APPROVAL_FLOWS[request.type];
      const currentStageConfig = flowConfig.stages.find(s => s.order === request.currentStage);
      
      if (currentStageConfig?.requiredRoles.includes(userRole)) {
        const alreadyApproved = request.approvals.some(
          a => a.approverId === userId && a.stage === request.currentStage
        );
        if (!alreadyApproved) {
          count++;
        }
      }
    }

    return count;
  }

  private async getCompletedTodayCount(): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return this.prisma.approvalRequest.count({
      where: {
        completedAt: { gte: todayStart },
        status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] }
      }
    });
  }

  public async getApprovalHistory(taskId: string): Promise<any[]> {
    return this.prisma.approvalRequest.findMany({
      where: { taskId },
      include: {
        submitter: {
          select: { id: true, name: true }
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true, role: { select: { name: true } } }
            }
          },
          orderBy: { decidedAt: 'asc' }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });
  }

  public async getRolePermissions(roleCode: RoleCode): Promise<Permission[]> {
    return ROLE_PERMISSIONS[roleCode] || [];
  }

  public async getApprovalFlowConfig(type: string): Promise<ApprovalFlowConfig | undefined> {
    return DEFAULT_APPROVAL_FLOWS[type];
  }

  private async logApprovalEvent(
    taskId: string,
    content: string,
    userId: string
  ): Promise<void> {
    try {
      await this.prisma.computeLog.create({
        data: {
          taskId,
          computePhase: 'APPROVAL',
          logContent: content,
          logLevel: 'INFO',
          createdBy: userId !== 'system' ? userId : undefined
        }
      });
    } catch (error) {
      console.error('Failed to log approval event:', error);
    }
  }

  public async getNavigationStatus(taskId: string): Promise<any> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        navigationSystemId: true,
        navigationSystemStatus: true
      }
    });

    if (!task?.navigationSystemId) {
      return { success: false, message: 'Task not pushed to navigation system' };
    }

    return {
      success: true,
      navigationId: task.navigationSystemId,
      status: task.navigationSystemStatus,
      message: `Current status: ${task.navigationSystemStatus}`
    };
  }

  public async resubmitForApproval(
    approvalRequestId: string,
    resubmittedBy: string,
    comments?: string
  ): Promise<{ success: boolean; message: string }> {
    const existingRequest = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId }
    });

    if (!existingRequest) {
      return { success: false, message: 'Approval request not found' };
    }

    if (existingRequest.status !== ApprovalStatus.CHANGES_REQUESTED && 
        existingRequest.status !== ApprovalStatus.REJECTED) {
      return { success: false, message: 'Only rejected or changes requested approvals can be resubmitted' };
    }

    return this.submitForApproval(
      existingRequest.taskId,
      existingRequest.type as any,
      resubmittedBy,
      comments || '修改后重新提交'
    );
  }
}

export default ApprovalService;
