import { RoleCode, ApprovalStatus } from '../../../../shared/types/enums';

export interface ApprovalFlowConfig {
  stages: ApprovalStage[];
  autoApproveThreshold?: number;
  requireAllApprovers?: boolean;
}

export interface ApprovalStage {
  id: string;
  name: string;
  order: number;
  requiredRoles: RoleCode[];
  minApprovers: number;
  timeoutHours?: number;
  escalationRole?: RoleCode;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  type: 'source_validation' | 'treatment_confirmation';
  status: ApprovalStatus;
  currentStage: number;
  totalStages: number;
  submittedBy: string;
  submittedAt: Date;
  completedAt?: Date;
  approvals: ApprovalDecision[];
  comments?: string;
}

export interface ApprovalDecision {
  id: string;
  approvalRequestId: string;
  stage: number;
  approverId: string;
  decision: 'approve' | 'reject' | 'request_changes' | 'escalate';
  comments: string;
  decidedAt: Date;
  attachments?: string[];
}

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'submit';
  condition?: string;
}

export interface RolePermissions {
  roleCode: RoleCode;
  permissions: Permission[];
}

export const DEFAULT_APPROVAL_FLOWS: Record<string, ApprovalFlowConfig> = {
  source_validation: {
    stages: [
      {
        id: 'stage-1',
        name: '临床工程师验证',
        order: 1,
        requiredRoles: [RoleCode.CLINICAL_ENGINEER],
        minApprovers: 1,
        timeoutHours: 24,
        escalationRole: RoleCode.NEUROPHYSIOLOGIST
      }
    ],
    requireAllApprovers: true
  },
  treatment_confirmation: {
    stages: [
      {
        id: 'stage-1',
        name: '临床工程师验证',
        order: 1,
        requiredRoles: [RoleCode.CLINICAL_ENGINEER],
        minApprovers: 1,
        timeoutHours: 12,
        escalationRole: RoleCode.NEUROPHYSIOLOGIST
      },
      {
        id: 'stage-2',
        name: '神经内科主任确认',
        order: 2,
        requiredRoles: [RoleCode.NEUROLOGY_DIRECTOR],
        minApprovers: 1,
        timeoutHours: 24,
        escalationRole: RoleCode.CHIEF_SCIENTIST
      }
    ],
    requireAllApprovers: true
  }
};

export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  [RoleCode.SYSTEM_ADMIN]: [
    { resource: 'all', action: 'create' },
    { resource: 'all', action: 'read' },
    { resource: 'all', action: 'update' },
    { resource: 'all', action: 'delete' },
    { resource: 'all', action: 'approve' },
    { resource: 'all', action: 'submit' }
  ],
  [RoleCode.CLINICAL_ENGINEER]: [
    { resource: 'task', action: 'create' },
    { resource: 'task', action: 'read' },
    { resource: 'task', action: 'update' },
    { resource: 'source_result', action: 'read' },
    { resource: 'source_result', action: 'approve' },
    { resource: 'target_plan', action: 'read' },
    { resource: 'target_plan', action: 'submit' },
    { resource: 'approval', action: 'read' },
    { resource: 'patient', action: 'read' },
    { resource: 'file', action: 'create' },
    { resource: 'file', action: 'read' },
    { resource: 'report', action: 'read' },
    { resource: 'report', action: 'create' }
  ],
  [RoleCode.NEUROPHYSIOLOGIST]: [
    { resource: 'task', action: 'read' },
    { resource: 'source_result', action: 'read' },
    { resource: 'source_result', action: 'update' },
    { resource: 'alert', action: 'read' },
    { resource: 'alert', action: 'update' },
    { resource: 'alert', action: 'approve' },
    { resource: 'adjustment_log', action: 'read' },
    { resource: 'adjustment_log', action: 'create' },
    { resource: 'approval', action: 'read' },
    { resource: 'patient', action: 'read' },
    { resource: 'report', action: 'read' }
  ],
  [RoleCode.NEUROLOGY_DIRECTOR]: [
    { resource: 'task', action: 'read' },
    { resource: 'source_result', action: 'read' },
    { resource: 'target_plan', action: 'read' },
    { resource: 'target_plan', action: 'approve' },
    { resource: 'approval', action: 'read' },
    { resource: 'approval', action: 'approve' },
    { resource: 'patient', action: 'read' },
    { resource: 'report', action: 'read' },
    { resource: 'report', action: 'approve' },
    { resource: 'analytics', action: 'read' }
  ],
  [RoleCode.CHIEF_SCIENTIST]: [
    { resource: 'task', action: 'read' },
    { resource: 'source_result', action: 'read' },
    { resource: 'target_plan', action: 'read' },
    { resource: 'patient', action: 'read' },
    { resource: 'patient', action: 'update' },
    { resource: 'alert', action: 'read' },
    { resource: 'approval', action: 'read' },
    { resource: 'approval', action: 'approve' },
    { resource: 'config', action: 'read' },
    { resource: 'config', action: 'update' },
    { resource: 'analytics', action: 'read' },
    { resource: 'report', action: 'read' }
  ],
  [RoleCode.LAB_TECHNICIAN]: [
    { resource: 'task', action: 'read' },
    { resource: 'target_plan', action: 'read' },
    { resource: 'patient', action: 'read' },
    { resource: 'stimulation_params', action: 'read' },
    { resource: 'stimulation_log', action: 'create' },
    { resource: 'stimulation_log', action: 'read' }
  ]
};

export const DEFAULT_NAVIGATION_SYSTEM_CONFIG = {
  endpoint: 'http://navigation-system.local/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 5000
};

export interface NavigationSystemResponse {
  success: boolean;
  navigationId?: string;
  status?: string;
  message?: string;
  stimulationParams?: any;
}

export interface ApprovalQueryParams {
  taskId?: string;
  type?: 'source_validation' | 'treatment_confirmation';
  status?: ApprovalStatus;
  stage?: number;
  submittedBy?: string;
  approverId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface ApprovalListResponse {
  requests: any[];
  total: number;
  page: number;
  pageSize: number;
  pendingMyApproval: number;
  completedToday: number;
}
