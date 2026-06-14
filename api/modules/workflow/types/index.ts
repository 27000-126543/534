import { TaskStatus, RoleCode } from '../../../../shared/types/enums';
import { AlgorithmParams } from '../../../../shared/types/api';

export interface StateTransition {
  from: TaskStatus | null;
  to: TaskStatus;
  allowedRoles: RoleCode[];
  requiresReason: boolean;
  autoTrigger?: boolean;
  description: string;
}

export interface StateTransitionResult {
  success: boolean;
  allowed: boolean;
  newStatus?: TaskStatus;
  error?: string;
  requiresApproval?: boolean;
  approvalLevel?: 1 | 2;
}

export interface WorkflowContext {
  taskId: string;
  currentStatus: TaskStatus;
  userId: string;
  userRole: RoleCode;
  reason?: string;
  algorithmParams?: AlgorithmParams;
  algorithmType?: string;
  metadata?: Record<string, unknown>;
}

export interface StatusHistoryRecord {
  id: string;
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  reason: string | null;
  operatorId: string | null;
  createdAt: Date;
}

export interface WorkflowEvent {
  type: 'status_changed' | 'alert_triggered' | 'approval_required' | 'computation_completed';
  taskId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type WorkflowEventHandler = (event: WorkflowEvent) => void | Promise<void>;
