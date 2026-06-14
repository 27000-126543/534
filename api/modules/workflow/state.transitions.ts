import { TaskStatus, RoleCode } from '../../../../shared/types/enums';
import { StateTransition } from './types';

export const STATE_TRANSITIONS: StateTransition[] = [
  {
    from: null,
    to: TaskStatus.PENDING_VALIDATION,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN],
    requiresReason: false,
    autoTrigger: true,
    description: '任务创建，进入待校验状态'
  },
  {
    from: TaskStatus.PENDING_VALIDATION,
    to: TaskStatus.HEAD_MODEL_BUILDING,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN],
    requiresReason: false,
    autoTrigger: true,
    description: '数据校验通过，开始构建头模型'
  },
  {
    from: TaskStatus.PENDING_VALIDATION,
    to: TaskStatus.VALIDATION_FAILED,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.EXPERT],
    requiresReason: true,
    description: '数据校验失败'
  },
  {
    from: TaskStatus.HEAD_MODEL_BUILDING,
    to: TaskStatus.FORWARD_COMPUTING,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN],
    requiresReason: false,
    autoTrigger: true,
    description: '头模型构建完成，开始正问题计算'
  },
  {
    from: TaskStatus.HEAD_MODEL_BUILDING,
    to: TaskStatus.HEAD_MODEL_FAILED,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.EXPERT],
    requiresReason: true,
    description: '头模型构建失败'
  },
  {
    from: TaskStatus.FORWARD_COMPUTING,
    to: TaskStatus.SOURCE_INVERTING,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN],
    requiresReason: false,
    autoTrigger: true,
    description: '正问题计算完成，开始源反演'
  },
  {
    from: TaskStatus.FORWARD_COMPUTING,
    to: TaskStatus.FORWARD_FAILED,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.EXPERT],
    requiresReason: true,
    description: '正问题计算失败'
  },
  {
    from: TaskStatus.SOURCE_INVERTING,
    to: TaskStatus.TARGET_EVALUATING,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN],
    requiresReason: false,
    autoTrigger: true,
    description: '源反演完成，开始靶点评估'
  },
  {
    from: TaskStatus.SOURCE_INVERTING,
    to: TaskStatus.SOURCE_FAILED,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.EXPERT],
    requiresReason: true,
    description: '源反演失败'
  },
  {
    from: TaskStatus.TARGET_EVALUATING,
    to: TaskStatus.PENDING_ENGINEER_APPROVAL,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN],
    requiresReason: false,
    autoTrigger: true,
    description: '靶点评估完成，待工程师审批'
  },
  {
    from: TaskStatus.TARGET_EVALUATING,
    to: TaskStatus.TARGET_FAILED,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.EXPERT],
    requiresReason: true,
    description: '靶点评估失败'
  },
  {
    from: TaskStatus.PENDING_ENGINEER_APPROVAL,
    to: TaskStatus.PENDING_DIRECTOR_APPROVAL,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN],
    requiresReason: true,
    description: '工程师审批通过，待主任审批'
  },
  {
    from: TaskStatus.PENDING_ENGINEER_APPROVAL,
    to: TaskStatus.ENGINEER_REJECTED,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN],
    requiresReason: true,
    description: '工程师审批驳回'
  },
  {
    from: TaskStatus.PENDING_DIRECTOR_APPROVAL,
    to: TaskStatus.PUSHING_TO_NAVIGATION,
    allowedRoles: [RoleCode.DIRECTOR, RoleCode.ADMIN],
    requiresReason: true,
    description: '主任审批通过，推送导航系统'
  },
  {
    from: TaskStatus.PENDING_DIRECTOR_APPROVAL,
    to: TaskStatus.DIRECTOR_REJECTED,
    allowedRoles: [RoleCode.DIRECTOR, RoleCode.ADMIN],
    requiresReason: true,
    description: '主任审批驳回'
  },
  {
    from: TaskStatus.PUSHING_TO_NAVIGATION,
    to: TaskStatus.COMPLETED,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN],
    requiresReason: false,
    autoTrigger: true,
    description: '导航系统推送完成，任务结束'
  },
  {
    from: TaskStatus.ENGINEER_REJECTED,
    to: TaskStatus.SOURCE_INVERTING,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.EXPERT],
    requiresReason: true,
    description: '重新计算源反演（调整参数或算法）'
  },
  {
    from: TaskStatus.DIRECTOR_REJECTED,
    to: TaskStatus.TARGET_EVALUATING,
    allowedRoles: [RoleCode.DIRECTOR, RoleCode.ADMIN, RoleCode.EXPERT],
    requiresReason: true,
    description: '重新评估靶点方案'
  },
  {
    from: TaskStatus.VALIDATION_FAILED,
    to: TaskStatus.PENDING_VALIDATION,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN],
    requiresReason: true,
    description: '重新提交数据校验'
  },
  {
    from: TaskStatus.HEAD_MODEL_FAILED,
    to: TaskStatus.HEAD_MODEL_BUILDING,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.EXPERT],
    requiresReason: true,
    description: '重新构建头模型'
  },
  {
    from: TaskStatus.FORWARD_FAILED,
    to: TaskStatus.FORWARD_COMPUTING,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.EXPERT],
    requiresReason: true,
    description: '重新计算正问题'
  },
  {
    from: TaskStatus.SOURCE_FAILED,
    to: TaskStatus.SOURCE_INVERTING,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.EXPERT],
    requiresReason: true,
    description: '重新进行源反演'
  },
  {
    from: TaskStatus.TARGET_FAILED,
    to: TaskStatus.TARGET_EVALUATING,
    allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.EXPERT],
    requiresReason: true,
    description: '重新评估靶点'
  },
  {
    from: TaskStatus.SOURCE_INVERTING,
    to: TaskStatus.ABNORMAL_FALLBACK,
    allowedRoles: [RoleCode.EXPERT, RoleCode.ADMIN, RoleCode.CHIEF_SCIENTIST],
    requiresReason: true,
    description: '异常回退（拟合残差超限或源偏移超限）'
  },
  {
    from: TaskStatus.ABNORMAL_FALLBACK,
    to: TaskStatus.SOURCE_INVERTING,
    allowedRoles: [RoleCode.EXPERT, RoleCode.ADMIN, RoleCode.CHIEF_SCIENTIST],
    requiresReason: true,
    description: '专家复核后重新计算'
  },
  {
    from: TaskStatus.COMPLETED,
    to: TaskStatus.SUSPENDED,
    allowedRoles: [RoleCode.ADMIN, RoleCode.CHIEF_SCIENTIST],
    requiresReason: true,
    description: '暂停任务'
  },
  {
    from: TaskStatus.SUSPENDED,
    to: TaskStatus.COMPLETED,
    allowedRoles: [RoleCode.ADMIN, RoleCode.CHIEF_SCIENTIST],
    requiresReason: true,
    description: '恢复任务'
  },
  {
    from: TaskStatus.PENDING_VALIDATION,
    to: TaskStatus.SUSPENDED,
    allowedRoles: [RoleCode.ADMIN, RoleCode.CHIEF_SCIENTIST],
    requiresReason: true,
    description: '暂停任务'
  },
  {
    from: TaskStatus.HEAD_MODEL_BUILDING,
    to: TaskStatus.SUSPENDED,
    allowedRoles: [RoleCode.ADMIN, RoleCode.CHIEF_SCIENTIST],
    requiresReason: true,
    description: '暂停任务'
  },
  {
    from: TaskStatus.FORWARD_COMPUTING,
    to: TaskStatus.SUSPENDED,
    allowedRoles: [RoleCode.ADMIN, RoleCode.CHIEF_SCIENTIST],
    requiresReason: true,
    description: '暂停任务'
  },
  {
    from: TaskStatus.TARGET_EVALUATING,
    to: TaskStatus.SUSPENDED,
    allowedRoles: [RoleCode.ADMIN, RoleCode.CHIEF_SCIENTIST],
    requiresReason: true,
    description: '暂停任务'
  }
];

export const COMPUTATION_STATUSES: TaskStatus[] = [
  TaskStatus.HEAD_MODEL_BUILDING,
  TaskStatus.FORWARD_COMPUTING,
  TaskStatus.SOURCE_INVERTING,
  TaskStatus.TARGET_EVALUATING,
  TaskStatus.PUSHING_TO_NAVIGATION
];

export const FAILED_STATUSES: TaskStatus[] = [
  TaskStatus.VALIDATION_FAILED,
  TaskStatus.HEAD_MODEL_FAILED,
  TaskStatus.FORWARD_FAILED,
  TaskStatus.SOURCE_FAILED,
  TaskStatus.TARGET_FAILED,
  TaskStatus.ENGINEER_REJECTED,
  TaskStatus.DIRECTOR_REJECTED
];

export const APPROVAL_REQUIRED_STATUSES: TaskStatus[] = [
  TaskStatus.PENDING_ENGINEER_APPROVAL,
  TaskStatus.PENDING_DIRECTOR_APPROVAL
];

export function getValidTransitions(fromStatus: TaskStatus | null): StateTransition[] {
  return STATE_TRANSITIONS.filter(t => t.from === fromStatus);
}

export function findTransition(
  fromStatus: TaskStatus | null,
  toStatus: TaskStatus
): StateTransition | undefined {
  return STATE_TRANSITIONS.find(t => t.from === fromStatus && t.to === toStatus);
}

export function canTransition(
  fromStatus: TaskStatus | null,
  toStatus: TaskStatus,
  userRole: RoleCode
): boolean {
  const transition = findTransition(fromStatus, toStatus);
  if (!transition) return false;
  return transition.allowedRoles.includes(userRole);
}

export function isAutoTransition(
  fromStatus: TaskStatus | null,
  toStatus: TaskStatus
): boolean {
  const transition = findTransition(fromStatus, toStatus);
  return transition?.autoTrigger ?? false;
}

export function getNextComputationStatus(currentStatus: TaskStatus): TaskStatus | null {
  const statusFlow: TaskStatus[] = [
    TaskStatus.PENDING_VALIDATION,
    TaskStatus.HEAD_MODEL_BUILDING,
    TaskStatus.FORWARD_COMPUTING,
    TaskStatus.SOURCE_INVERTING,
    TaskStatus.TARGET_EVALUATING,
    TaskStatus.PENDING_ENGINEER_APPROVAL
  ];
  
  const currentIndex = statusFlow.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= statusFlow.length - 1) {
    return null;
  }
  
  return statusFlow[currentIndex + 1];
}
