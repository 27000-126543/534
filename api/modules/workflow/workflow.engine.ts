import { PrismaClient, Task, TaskStatus, User } from '@prisma/client';
import { RoleCode } from '../../../../shared/types/enums';
import {
  WorkflowContext,
  StateTransitionResult,
  WorkflowEvent,
  WorkflowEventHandler,
  StatusHistoryRecord
} from './types';
import {
  findTransition,
  canTransition,
  isAutoTransition,
  getNextComputationStatus,
  COMPUTATION_STATUSES,
  APPROVAL_REQUIRED_STATUSES
} from './state.transitions';
import { calculateEuclideanDistance } from '../../utils/math';

export class WorkflowEngine {
  private prisma: PrismaClient;
  private eventHandlers: Map<string, WorkflowEventHandler[]> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public on(eventType: WorkflowEvent['type'], handler: WorkflowEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  public off(eventType: WorkflowEvent['type'], handler: WorkflowEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private async emit(event: WorkflowEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Workflow event handler error for ${event.type}:`, error);
      }
    }
  }

  public async validateTransition(
    context: WorkflowContext,
    targetStatus: TaskStatus
  ): Promise<StateTransitionResult> {
    const transition = findTransition(context.currentStatus, targetStatus);
    
    if (!transition) {
      return {
        success: false,
        allowed: false,
        error: `Invalid state transition from ${context.currentStatus} to ${targetStatus}`
      };
    }

    if (!transition.allowedRoles.includes(context.userRole)) {
      return {
        success: false,
        allowed: false,
        error: `Insufficient permissions for role ${context.userRole}`
      };
    }

    if (transition.requiresReason && !context.reason) {
      return {
        success: false,
        allowed: false,
        error: 'Reason is required for this transition'
      };
    }

    const task = await this.prisma.task.findUnique({
      where: { id: context.taskId },
      include: { patient: true }
    });

    if (!task) {
      return {
        success: false,
        allowed: false,
        error: 'Task not found'
      };
    }

    if (task.patient.isSuspended && targetStatus !== TaskStatus.SUSPENDED) {
      return {
        success: false,
        allowed: false,
        error: 'Patient is suspended, cannot proceed with task'
      };
    }

    return {
      success: true,
      allowed: true,
      newStatus: targetStatus
    };
  }

  public async transition(
    context: WorkflowContext,
    targetStatus: TaskStatus
  ): Promise<StateTransitionResult> {
    const validation = await this.validateTransition(context, targetStatus);
    
    if (!validation.success || !validation.allowed) {
      return validation;
    }

    const task = await this.prisma.task.findUnique({
      where: { id: context.taskId }
    });

    if (!task) {
      return { success: false, allowed: false, error: 'Task not found' };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.task.update({
          where: { id: context.taskId },
          data: {
            status: targetStatus,
            updatedAt: new Date()
          }
        });

        await tx.taskStatusEvent.create({
          data: {
            taskId: context.taskId,
            fromStatus: task.status,
            toStatus: targetStatus,
            reason: context.reason || null,
            operatorId: context.userId
          }
        });

        if (context.algorithmParams || context.algorithmType) {
          const updateData: any = {};
          if (context.algorithmParams) {
            updateData.algorithmParams = context.algorithmParams;
          }
          if (context.algorithmType) {
            updateData.algorithmType = context.algorithmType as any;
          }
          await tx.task.update({
            where: { id: context.taskId },
            data: updateData
          });
        }

        await tx.computeLog.create({
          data: {
            taskId: context.taskId,
            computePhase: `STATE_TRANSITION_${targetStatus}`,
            logContent: context.reason || `Transitioned to ${targetStatus}`,
            logLevel: 'INFO'
          }
        });
      });

      await this.emit({
        type: 'status_changed',
        taskId: context.taskId,
        data: {
          fromStatus: task.status,
          toStatus: targetStatus,
          reason: context.reason,
          operatorId: context.userId
        },
        timestamp: new Date()
      });

      if (APPROVAL_REQUIRED_STATUSES.includes(targetStatus)) {
        await this.handleApprovalRequired(context.taskId, targetStatus);
      }

      if (COMPUTATION_STATUSES.includes(targetStatus)) {
        await this.emit({
          type: 'computation_completed',
          taskId: context.taskId,
          data: {
            phase: targetStatus,
            completed: true
          },
          timestamp: new Date()
        });
      }

      return {
        success: true,
        allowed: true,
        newStatus: targetStatus
      };

    } catch (error) {
      console.error('State transition error:', error);
      return {
        success: false,
        allowed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async autoAdvance(taskId: string, userId: string, userRole: RoleCode): Promise<StateTransitionResult> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return { success: false, allowed: false, error: 'Task not found' };
    }

    const nextStatus = getNextComputationStatus(task.status);
    
    if (!nextStatus) {
      return {
        success: false,
        allowed: false,
        error: 'No automatic next status available'
      };
    }

    if (!isAutoTransition(task.status, nextStatus)) {
      return {
        success: false,
        allowed: false,
        error: 'This transition is not automatic'
      };
    }

    return this.transition(
      {
        taskId,
        currentStatus: task.status,
        userId,
        userRole,
        reason: 'Automatic workflow advancement'
      },
      nextStatus
    );
  }

  public async handleComputationError(
    taskId: string,
    userId: string,
    userRole: RoleCode,
    errorPhase: string,
    errorMessage: string
  ): Promise<StateTransitionResult> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return { success: false, allowed: false, error: 'Task not found' };
    }

    const errorStatusMap: Record<string, TaskStatus> = {
      'VALIDATION': TaskStatus.VALIDATION_FAILED,
      'HEAD_MODEL': TaskStatus.HEAD_MODEL_FAILED,
      'FORWARD': TaskStatus.FORWARD_FAILED,
      'SOURCE': TaskStatus.SOURCE_FAILED,
      'TARGET': TaskStatus.TARGET_FAILED
    };

    const targetStatus = errorStatusMap[errorPhase];
    if (!targetStatus) {
      return {
        success: false,
        allowed: false,
        error: `Invalid error phase: ${errorPhase}`
      };
    }

    return this.transition(
      {
        taskId,
        currentStatus: task.status,
        userId,
        userRole,
        reason: `Computation error: ${errorMessage}`
      },
      targetStatus
    );
  }

  public async handleAbnormalFallback(
    taskId: string,
    userId: string,
    userRole: RoleCode,
    alertType: string,
    alertMessage: string
  ): Promise<StateTransitionResult> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return { success: false, allowed: false, error: 'Task not found' };
    }

    const result = await this.transition(
      {
        taskId,
        currentStatus: task.status,
        userId,
        userRole,
        reason: `Abnormal fallback: ${alertType} - ${alertMessage}`
      },
      TaskStatus.ABNORMAL_FALLBACK
    );

    if (result.success) {
      await this.emit({
        type: 'alert_triggered',
        taskId,
        data: {
          alertType,
          alertMessage,
          status: TaskStatus.ABNORMAL_FALLBACK
        },
        timestamp: new Date()
      });
    }

    return result;
  }

  public async retryFromFailed(
    taskId: string,
    userId: string,
    userRole: RoleCode,
    reason: string,
    algorithmParams?: any,
    algorithmType?: string
  ): Promise<StateTransitionResult> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return { success: false, allowed: false, error: 'Task not found' };
    }

    const retryMap: Record<TaskStatus, TaskStatus> = {
      [TaskStatus.VALIDATION_FAILED]: TaskStatus.PENDING_VALIDATION,
      [TaskStatus.HEAD_MODEL_FAILED]: TaskStatus.HEAD_MODEL_BUILDING,
      [TaskStatus.FORWARD_FAILED]: TaskStatus.FORWARD_COMPUTING,
      [TaskStatus.SOURCE_FAILED]: TaskStatus.SOURCE_INVERTING,
      [TaskStatus.TARGET_FAILED]: TaskStatus.TARGET_EVALUATING,
      [TaskStatus.ENGINEER_REJECTED]: TaskStatus.SOURCE_INVERTING,
      [TaskStatus.DIRECTOR_REJECTED]: TaskStatus.TARGET_EVALUATING,
      [TaskStatus.ABNORMAL_FALLBACK]: TaskStatus.SOURCE_INVERTING,
      [TaskStatus.PENDING_VALIDATION]: TaskStatus.PENDING_VALIDATION,
      [TaskStatus.HEAD_MODEL_BUILDING]: TaskStatus.HEAD_MODEL_BUILDING,
      [TaskStatus.FORWARD_COMPUTING]: TaskStatus.FORWARD_COMPUTING,
      [TaskStatus.SOURCE_INVERTING]: TaskStatus.SOURCE_INVERTING,
      [TaskStatus.TARGET_EVALUATING]: TaskStatus.TARGET_EVALUATING,
      [TaskStatus.PENDING_ENGINEER_APPROVAL]: TaskStatus.PENDING_ENGINEER_APPROVAL,
      [TaskStatus.PENDING_DIRECTOR_APPROVAL]: TaskStatus.PENDING_DIRECTOR_APPROVAL,
      [TaskStatus.PUSHING_TO_NAVIGATION]: TaskStatus.PUSHING_TO_NAVIGATION,
      [TaskStatus.COMPLETED]: TaskStatus.COMPLETED,
      [TaskStatus.SUSPENDED]: TaskStatus.SUSPENDED
    };

    const targetStatus = retryMap[task.status];
    if (!targetStatus) {
      return {
        success: false,
        allowed: false,
        error: `Cannot retry from status: ${task.status}`
      };
    }

    return this.transition(
      {
        taskId,
        currentStatus: task.status,
        userId,
        userRole,
        reason,
        algorithmParams,
        algorithmType
      },
      targetStatus
    );
  }

  public async checkPatientDeviation(patientId: string): Promise<{
    shouldSuspend: boolean;
    deviation: number;
    taskCount: number;
    recentTasks: Task[];
  }> {
    const settings = await this.prisma.systemSettings.findFirst();
    const threshold = settings?.patientDeviationThreshold || 8;
    const consecutiveCount = settings?.consecutiveDeviationCount || 3;

    const recentTasks = await this.prisma.task.findMany({
      where: {
        patientId,
        sourceResult: { isNot: null }
      },
      include: {
        sourceResult: true
      },
      orderBy: { createdAt: 'desc' },
      take: consecutiveCount
    });

    if (recentTasks.length < consecutiveCount) {
      return {
        shouldSuspend: false,
        deviation: 0,
        taskCount: recentTasks.length,
        recentTasks: []
      };
    }

    const sourceCenters = recentTasks
      .filter(t => t.sourceResult?.dipoleParameters)
      .map(t => {
        const params = t.sourceResult!.dipoleParameters as any;
        return params.position as [number, number, number];
      })
      .filter(Boolean);

    if (sourceCenters.length < consecutiveCount) {
      return {
        shouldSuspend: false,
        deviation: 0,
        taskCount: sourceCenters.length,
        recentTasks: []
      };
    }

    let maxDeviation = 0;
    for (let i = 1; i < sourceCenters.length; i++) {
      const dist = calculateEuclideanDistance(sourceCenters[i - 1], sourceCenters[i]);
      maxDeviation = Math.max(maxDeviation, dist);
    }

    return {
      shouldSuspend: maxDeviation > threshold,
      deviation: maxDeviation,
      taskCount: recentTasks.length,
      recentTasks
    };
  }

  public async suspendPatient(
    patientId: string,
    userId: string,
    reason: string,
    triggeredByTaskId: string,
    deviationMm: number
  ): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.patient.update({
          where: { id: patientId },
          data: {
            isSuspended: true,
            suspendedAt: new Date(),
            suspendedById: userId,
            suspensionReason: reason
          }
        });

        await tx.patientSuspension.create({
          data: {
            patientId,
            triggeredByTaskId,
            deviationMm
          }
        });

        await tx.task.updateMany({
          where: {
            patientId,
            status: {
              in: [
                TaskStatus.PENDING_VALIDATION,
                TaskStatus.HEAD_MODEL_BUILDING,
                TaskStatus.FORWARD_COMPUTING,
                TaskStatus.SOURCE_INVERTING,
                TaskStatus.TARGET_EVALUATING
              ]
            }
          },
          data: {
            status: TaskStatus.SUSPENDED
          }
        });
      });

      return true;
    } catch (error) {
      console.error('Error suspending patient:', error);
      return false;
    }
  }

  private async handleApprovalRequired(taskId: string, status: TaskStatus): Promise<void> {
    const approvalLevel = status === TaskStatus.PENDING_ENGINEER_APPROVAL ? 1 : 2;

    await this.prisma.approval.create({
      data: {
        taskId,
        approvalLevel
      }
    });

    await this.emit({
      type: 'approval_required',
      taskId,
      data: {
        approvalLevel,
        status
      },
      timestamp: new Date()
    });
  }

  public async getTaskHistory(taskId: string): Promise<StatusHistoryRecord[]> {
    const events = await this.prisma.taskStatusEvent.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        operator: {
          select: {
            id: true,
            fullName: true,
            title: true
          }
        }
      }
    });

    return events.map(event => ({
      id: event.id,
      taskId: event.taskId,
      fromStatus: event.fromStatus as TaskStatus | null,
      toStatus: event.toStatus as TaskStatus,
      reason: event.reason,
      operatorId: event.operatorId,
      createdAt: event.createdAt
    }));
  }

  public async getCurrentApproval(taskId: string): Promise<any> {
    return this.prisma.approval.findFirst({
      where: {
        taskId,
        status: 'PENDING'
      },
      include: {
        approver: {
          select: {
            id: true,
            fullName: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async getTaskProgress(taskId: string): Promise<number> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) return 0;

    const progressMap: Record<TaskStatus, number> = {
      [TaskStatus.PENDING_VALIDATION]: 5,
      [TaskStatus.VALIDATION_FAILED]: 5,
      [TaskStatus.HEAD_MODEL_BUILDING]: 20,
      [TaskStatus.HEAD_MODEL_FAILED]: 20,
      [TaskStatus.FORWARD_COMPUTING]: 40,
      [TaskStatus.FORWARD_FAILED]: 40,
      [TaskStatus.SOURCE_INVERTING]: 60,
      [TaskStatus.SOURCE_FAILED]: 60,
      [TaskStatus.ABNORMAL_FALLBACK]: 60,
      [TaskStatus.TARGET_EVALUATING]: 75,
      [TaskStatus.TARGET_FAILED]: 75,
      [TaskStatus.PENDING_ENGINEER_APPROVAL]: 80,
      [TaskStatus.ENGINEER_REJECTED]: 80,
      [TaskStatus.PENDING_DIRECTOR_APPROVAL]: 90,
      [TaskStatus.DIRECTOR_REJECTED]: 90,
      [TaskStatus.PUSHING_TO_NAVIGATION]: 95,
      [TaskStatus.COMPLETED]: 100,
      [TaskStatus.SUSPENDED]: 0
    };

    return progressMap[task.status] || 0;
  }
}

export default WorkflowEngine;
