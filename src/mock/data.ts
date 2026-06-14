import { RoleCode, TaskStatus, AlgorithmType, AlertType, AlertSeverity, ApprovalStatus, BrainRegion, StimulationPattern } from '../../shared/types/enums';
import type { UserSummary, PatientSummary, TaskSummary, TaskDetailResponse, TaskStatusEvent, ApprovalRecord, AlertData, MonitoringMetric, HeadModelData, ForwardResultData, SourceResultData, TargetPlanData, PaginatedResponse, AnalyticsDashboardData, AuthResponse } from '../../shared/types/api';

export const mockUsers: Record<string, { password: string; user: UserSummary }> = {
  admin: {
    password: 'demo123456',
    user: {
      id: 'u_admin',
      username: 'admin',
      fullName: '赵管理员',
      title: '系统管理员',
      roleCode: RoleCode.ADMIN,
      roleName: '系统管理员'
    }
  },
  eng1: {
    password: 'demo123456',
    user: {
      id: 'u_eng1',
      username: 'eng1',
      fullName: '李工程师',
      title: '临床工程师',
      roleCode: RoleCode.ENGINEER,
      roleName: '临床工程师'
    }
  },
  dir1: {
    password: 'demo123456',
    user: {
      id: 'u_dir1',
      username: 'dir1',
      fullName: '钱主任',
      title: '神经内科主任',
      roleCode: RoleCode.DIRECTOR,
      roleName: '神经内科主任'
    }
  },
  exp1: {
    password: 'demo123456',
    user: {
      id: 'u_exp1',
      username: 'exp1',
      fullName: '王专家',
      title: '神经电生理专家',
      roleCode: RoleCode.EXPERT,
      roleName: '神经电生理专家'
    }
  },
  chief1: {
    password: 'demo123456',
    user: {
      id: 'u_chief1',
      username: 'chief1',
      fullName: '孙首席',
      title: '首席科学家',
      roleCode: RoleCode.CHIEF_SCIENTIST,
      roleName: '首席科学家'
    }
  },
  tech1: {
    password: 'demo123456',
    user: {
      id: 'u_tech1',
      username: 'tech1',
      fullName: '周技术员',
      title: '实验室技术员',
      roleCode: RoleCode.TECHNICIAN,
      roleName: '实验室技术员'
    }
  }
};

export const mockPatients: PatientSummary[] = [
  { id: 'p1', medicalRecordNo: 'MR001', name: '张某某', gender: '男', age: 45, diagnosis: '重度抑郁症', isSuspended: false },
  { id: 'p2', medicalRecordNo: 'MR002', name: '李某某', gender: '女', age: 38, diagnosis: '强迫症', isSuspended: false },
  { id: 'p3', medicalRecordNo: 'MR003', name: '王某某', gender: '男', age: 52, diagnosis: '精神分裂症（幻听）', isSuspended: false },
  { id: 'p4', medicalRecordNo: 'MR004', name: '赵某某', gender: '女', age: 29, diagnosis: '创伤后应激障碍', isSuspended: true },
  { id: 'p5', medicalRecordNo: 'MR005', name: '孙某某', gender: '男', age: 61, diagnosis: '帕金森病（抑郁伴发）', isSuspended: false }
];

export const mockHeadModel: HeadModelData = {
  id: 'hm1',
  scalpMesh: { vertices: [], faces: [] },
  skullMesh: { vertices: [], faces: [] },
  brainMesh: { vertices: [], faces: [] },
  conductivityParams: { scalp: 0.43, skull: 0.013, brain: 0.33, unit: 'S/m' },
  meshQuality: 0.94,
  triangleCount: 15420,
  createdAt: '2024-06-14T08:45:00Z'
};

export const mockForwardResult: ForwardResultData = {
  id: 'fw1',
  leadfieldMatrix: { channels: [], sources: [], matrix: [] },
  solutionMethod: 'BEM (Symmetric Boundary Element Method)',
  computationTime: 12.4,
  createdAt: '2024-06-14T09:00:00Z'
};

export function generateMonitoringMetrics(count: number): MonitoringMetric[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    timeWindow: i + 1,
    timeRange: [i * 100, (i + 1) * 100],
    residualError: i === 22 ? 12.3 : i === 45 ? 10.8 : 3 + Math.random() * 5,
    sourceCenter: [-20 + Math.random() * 3, 35 + Math.random() * 3, 40 + Math.random() * 3] as [number, number, number],
    offsetFromPrevious: i === 30 ? 6.2 : i === 31 ? 5.8 : Math.random() * 3,
    isAlertTriggered: i === 22 || i === 45 || i === 30,
    alertType: i === 22 ? AlertType.RESIDUAL_EXCEEDED : i === 45 ? AlertType.RESIDUAL_EXCEEDED : i === 30 ? AlertType.SOURCE_OFFSET_EXCEEDED : undefined,
    createdAt: new Date(Date.now() + i * 1000).toISOString()
  }));
}

export const mockSourceResult: SourceResultData = {
  id: 'sr1',
  algorithmUsed: AlgorithmType.SLORETA,
  algorithmUsedText: 'sLORETA',
  currentDensity: { vertices: [], values: [], timePoints: [], unit: 'A/m²' },
  sourceTimeSeries: { labels: [], regions: [], data: [], timePoints: [], unit: 'nAm', samplingRate: 1000 },
  dipoleParameters: {
    position: [-18.5, 36.2, 41.3],
    moment: [0.3, 0.8, 0.5],
    goodnessOfFit: 0.92,
    residualError: 6.8
  },
  confidenceEllipsoid: {
    center: [-18.5, 36.2, 41.3],
    radii: [4.1, 3.6, 5.2],
    rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    confidenceLevel: 0.95,
    unit: 'mm'
  },
  meanResidual: 6.8,
  sourceSpatialAccuracy: 3.2,
  regularizationParam: 0.05,
  monitoringMetrics: generateMonitoringMetrics(60),
  createdAt: '2024-06-14T09:20:00Z'
};

export const mockTargetPlan: TargetPlanData = {
  id: 'tp1',
  coilPosition: [-18.5, 36.2, 41.3],
  coilOrientation: { normal: [0.2, 0.8, 0.5], handleDirection: [0.9, -0.3, 0.1], angleDegrees: 45 },
  currentIntensity: 1.2,
  pulseCount: 1500,
  pulsePattern: StimulationPattern.RTMS,
  pulsePatternText: '重复经颅磁刺激',
  focalityIndex: 0.87,
  targetCoverage: 0.92,
  stimulationVolume: 12.4,
  targetRegion: BrainRegion.LEFT_DLPFC,
  targetRegionText: '左侧背外侧前额叶',
  isAIRecommended: true,
  aiRecommendationParams: {
    modelVersion: 'v2.1.0',
    confidence: 0.94,
    historicalSimilarity: 0.88,
    features: [
      { name: '病灶距离', importance: 0.32, value: 4.2 },
      { name: '白质纤维束密度', importance: 0.28, value: 0.76 },
      { name: '颅骨厚度', importance: 0.18, value: 6.8 },
      { name: '历史有效率', importance: 0.22, value: 0.85 }
    ]
  },
  alternativePlans: [
    {
      id: 'alt1',
      coilPosition: [-22.1, 34.8, 39.5],
      coilOrientation: { normal: [0.15, 0.85, 0.45], handleDirection: [0.88, -0.25, 0.15], angleDegrees: 52 },
      currentIntensity: 1.35,
      focalityIndex: 0.79,
      targetCoverage: 0.96,
      tradeOffReason: '更高覆盖率但聚焦度略降，适合需要更大刺激范围的情况'
    },
    {
      id: 'alt2',
      coilPosition: [-15.8, 38.1, 43.2],
      coilOrientation: { normal: [0.25, 0.75, 0.55], handleDirection: [0.92, -0.35, 0.05], angleDegrees: 38 },
      currentIntensity: 1.1,
      focalityIndex: 0.91,
      targetCoverage: 0.84,
      tradeOffReason: '超高聚焦度但覆盖减少，适合靶区紧邻功能区的精细刺激'
    }
  ],
  createdAt: '2024-06-14T09:35:00Z'
};

export function createMockTask(status: TaskStatus = TaskStatus.SOURCE_INVERTING, progress: number = 65): TaskDetailResponse {
  const now = new Date().toISOString();
  return {
    id: 'task_' + Math.random().toString(36).slice(2, 9),
    taskNo: 'TSK-' + new Date().getFullYear() + String(Math.floor(Math.random() * 9000 + 1000)),
    taskName: '左侧DLPFC抑郁症精准定位',
    patient: mockPatients[0],
    createdBy: mockUsers.eng1.user,
    status,
    statusText: ({
      [TaskStatus.PENDING_VALIDATION]: '待校验',
      [TaskStatus.HEAD_MODEL_BUILDING]: '头模型构建中',
      [TaskStatus.FORWARD_COMPUTING]: '正问题计算中',
      [TaskStatus.SOURCE_INVERTING]: '源反演计算中',
      [TaskStatus.TARGET_EVALUATING]: '靶点评估中',
      [TaskStatus.PENDING_ENGINEER_APPROVAL]: '待工程师审批',
      [TaskStatus.ENGINEER_REJECTED]: '工程师已驳回',
      [TaskStatus.PENDING_DIRECTOR_APPROVAL]: '待主任审批',
      [TaskStatus.DIRECTOR_REJECTED]: '主任已驳回',
      [TaskStatus.PUSHING_TO_NAVIGATION]: '推送导航系统中',
      [TaskStatus.COMPLETED]: '已完成',
      [TaskStatus.SUSPENDED]: '已暂停',
      [TaskStatus.ABNORMAL_FALLBACK]: '异常回退',
      [TaskStatus.VALIDATION_FAILED]: '校验失败',
      [TaskStatus.HEAD_MODEL_FAILED]: '头模型构建失败',
      [TaskStatus.FORWARD_FAILED]: '正问题计算失败',
      [TaskStatus.SOURCE_FAILED]: '源反演计算失败',
      [TaskStatus.TARGET_FAILED]: '靶点评估失败'
    } as any)[status] || '未知状态',
    algorithmType: AlgorithmType.SLORETA,
    algorithmTypeText: 'sLORETA',
    algorithmParams: {
      regularizationParam: 0.05,
      timeWindow: 100,
      overlap: 50,
      maxIterations: 1000,
      convergenceThreshold: 1e-6
    },
    targetBrainRegion: BrainRegion.LEFT_DLPFC,
    targetBrainRegionText: '左侧背外侧前额叶',
    currentPhase: status,
    progress,
    notes: '患者MDD-III型，药物反应不佳，建议高聚焦度方案',
    headModel: progress >= 25 ? mockHeadModel : undefined,
    forwardResult: progress >= 50 ? mockForwardResult : undefined,
    sourceResult: progress >= 75 ? mockSourceResult : undefined,
    targetPlan: progress >= 100 ? mockTargetPlan : undefined,
    timeline: [
      { id: 't1', fromStatus: null, toStatus: TaskStatus.PENDING_VALIDATION, toStatusText: '待校验', reason: null, operator: null, createdAt: now },
      { id: 't2', fromStatus: TaskStatus.PENDING_VALIDATION, toStatus: TaskStatus.HEAD_MODEL_BUILDING, toStatusText: '头模型构建中', reason: '数据校验通过', operator: null, createdAt: now },
      { id: 't3', fromStatus: TaskStatus.HEAD_MODEL_BUILDING, toStatus: TaskStatus.FORWARD_COMPUTING, toStatusText: '正问题计算中', reason: '三层头模型构建完成，质量评分0.94', operator: null, createdAt: now }
    ],
    approvals: [
      {
        id: 'a1',
        taskId: '1',
        approvalLevel: 1,
        approvalLevelText: '临床工程师审批',
        approver: null,
        status: ApprovalStatus.PENDING,
        statusText: '待审批',
        comment: null,
        approvedAt: null,
        createdAt: now
      },
      {
        id: 'a2',
        taskId: '1',
        approvalLevel: 2,
        approvalLevelText: '神经内科主任审批',
        approver: null,
        status: ApprovalStatus.PENDING,
        statusText: '待审批',
        comment: null,
        approvedAt: null,
        createdAt: now
      }
    ],
    alerts: progress >= 60 ? [
      {
        id: 'al1',
        taskId: '1',
        taskNo: 'TSK-2024015',
        patientName: '张某某',
        alertType: AlertType.RESIDUAL_EXCEEDED,
        alertTypeText: '拟合残差超限',
        severity: AlertSeverity.WARNING,
        severityText: '警告',
        threshold: 10,
        actualValue: 12.3,
        unit: '%',
        description: '第23时间窗偶极子拟合残差12.3%超过阈值10%',
        suggestion: '建议调整正则化参数至0.08或切换至Beamforming算法',
        isResolved: false,
        createdAt: now
      }
    ] : [],
    pushToNavigation: false,
    createdAt: now,
    updatedAt: now
  };
}

export function generateTaskList(count: number = 15): PaginatedResponse<TaskSummary> {
  const statuses = [
    TaskStatus.PENDING_VALIDATION, TaskStatus.HEAD_MODEL_BUILDING, TaskStatus.FORWARD_COMPUTING,
    TaskStatus.SOURCE_INVERTING, TaskStatus.TARGET_EVALUATING, TaskStatus.PENDING_ENGINEER_APPROVAL,
    TaskStatus.PENDING_DIRECTOR_APPROVAL, TaskStatus.COMPLETED
  ];
  const algorithms = [AlgorithmType.SLORETA, AlgorithmType.BEAMFORMING, AlgorithmType.MNLS];

  const data: TaskSummary[] = Array.from({ length: count }, (_, i) => {
    const status = statuses[i % statuses.length];
    return {
      id: 'task_' + (i + 1),
      taskNo: 'TSK-' + (2024000 + i + 15),
      patient: mockPatients[i % mockPatients.length],
      createdBy: [mockUsers.eng1.user, mockUsers.exp1.user][i % 2],
      status,
      statusText: ({
        [TaskStatus.PENDING_VALIDATION]: '待校验',
        [TaskStatus.HEAD_MODEL_BUILDING]: '头模型构建中',
        [TaskStatus.FORWARD_COMPUTING]: '正问题计算中',
        [TaskStatus.SOURCE_INVERTING]: '源反演计算中',
        [TaskStatus.TARGET_EVALUATING]: '靶点评估中',
        [TaskStatus.PENDING_ENGINEER_APPROVAL]: '待工程师审批',
        [TaskStatus.ENGINEER_REJECTED]: '工程师已驳回',
        [TaskStatus.PENDING_DIRECTOR_APPROVAL]: '待主任审批',
        [TaskStatus.DIRECTOR_REJECTED]: '主任已驳回',
        [TaskStatus.COMPLETED]: '已完成',
        [TaskStatus.SUSPENDED]: '已暂停'
      } as any)[status],
      algorithmType: algorithms[i % algorithms.length] as any,
      algorithmTypeText: algorithms[i % algorithms.length] === AlgorithmType.SLORETA ? 'sLORETA' : algorithms[i % algorithms.length] === AlgorithmType.BEAMFORMING ? 'Beamforming' : 'MNLS',
      progress: status === TaskStatus.COMPLETED ? 100 : Math.floor(Math.random() * 80) + 10,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - i * 1800000).toISOString()
    };
  });

  return {
    data,
    total: count,
    page: 1,
    pageSize: 20,
    totalPages: 1
  };
}

export function generateAuthResponse(user: UserSummary): AuthResponse {
  const payload = Buffer.from(JSON.stringify({ id: user.id, roleCode: user.roleCode, exp: Date.now() + 86400000 })).toString('base64');
  return {
    success: true,
    accessToken: 'mock.' + payload + '.sig',
    refreshToken: 'mock.refresh.' + payload + '.sig',
    user,
    requiresTwoFactor: false
  };
}

export function parseMockToken(token: string): { id: string; roleCode: RoleCode } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const mockAnalytics: AnalyticsDashboardData = {
  summary: {
    totalTasks: 156,
    completedTasks: 124,
    completionRate: 0.795,
    avgAccuracy: 94.2,
    avgCoverage: 89.7,
    alertCount: 23,
    pendingApprovals: 8,
    avgComputationTime: 24.6
  },
  trends: {
    dates: ['06-08', '06-09', '06-10', '06-11', '06-12', '06-13', '06-14'],
    taskCounts: [18, 22, 25, 19, 24, 28, 20],
    completedCounts: [14, 18, 21, 15, 20, 23, 13],
    accuracyTrend: [92.1, 93.4, 93.8, 94.0, 94.5, 94.8, 95.2],
    coverageTrend: [87.5, 88.2, 88.9, 89.1, 89.8, 90.2, 90.5],
    alertTrend: [4, 3, 5, 2, 4, 3, 2]
  },
  radar: {
    categories: ['定位精度', '靶区覆盖', '聚焦指数', '计算效率', '算法稳定性', '临床有效率'],
    current: [94, 90, 87, 82, 91, 88],
    target: [95, 92, 90, 85, 95, 92]
  },
  taskDistribution: {
    statuses: ['待校验', '头模型构建', '正问题计算', '源反演', '靶点评估', '审批中', '已完成', '异常'],
    counts: [5, 4, 3, 6, 2, 8, 124, 4],
    colors: ['#FF9800', '#42A5F5', '#42A5F5', '#42A5F5', '#42A5F5', '#FF9800', '#26A69A', '#EF5350']
  },
  regionPerformance: {
    regions: ['左DLPFC', '右DLPFC', 'M1运动区', 'SMA辅助区', '颞叶', '顶叶'],
    accuracy: [95.2, 94.8, 92.6, 93.1, 91.8, 90.5],
    coverage: [91.3, 90.7, 88.2, 87.5, 85.6, 84.3],
    taskCount: [58, 42, 24, 15, 10, 7]
  },
  algorithmPerformance: {
    algorithms: ['sLORETA', 'Beamforming', 'MNLS', 'LORETA', 'DICS'],
    accuracy: [94.5, 93.2, 91.8, 90.5, 89.7],
    speed: [78, 62, 85, 70, 55],
    usageCount: [82, 35, 18, 12, 9]
  },
  lastUpdated: new Date().toISOString()
};

export function getValidTransitions(status: TaskStatus, roleCode: RoleCode) {
  const transitionsMap: Record<string, { targetStatus: TaskStatus; label: string; allowedRoles: RoleCode[] }[]> = {
    [TaskStatus.PENDING_VALIDATION]: [
      { targetStatus: TaskStatus.HEAD_MODEL_BUILDING, label: '数据校验通过，开始构建头模型', allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.TECHNICIAN] }
    ],
    [TaskStatus.HEAD_MODEL_BUILDING]: [
      { targetStatus: TaskStatus.FORWARD_COMPUTING, label: '头模型构建完成，开始正问题求解', allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN] }
    ],
    [TaskStatus.FORWARD_COMPUTING]: [
      { targetStatus: TaskStatus.SOURCE_INVERTING, label: '正问题求解完成，开始源反演', allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN] }
    ],
    [TaskStatus.SOURCE_INVERTING]: [
      { targetStatus: TaskStatus.TARGET_EVALUATING, label: '源反演完成，开始靶点评估优化', allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN] }
    ],
    [TaskStatus.TARGET_EVALUATING]: [
      { targetStatus: TaskStatus.PENDING_ENGINEER_APPROVAL, label: '计算完成，提交工程师一级审批', allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN] }
    ],
    [TaskStatus.PENDING_ENGINEER_APPROVAL]: [
      { targetStatus: TaskStatus.PENDING_DIRECTOR_APPROVAL, label: '工程师审批通过，提交主任二级审批', allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN] },
      { targetStatus: TaskStatus.ENGINEER_REJECTED, label: '工程师驳回，返回修改', allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN] }
    ],
    [TaskStatus.ENGINEER_REJECTED]: [
      { targetStatus: TaskStatus.TARGET_EVALUATING, label: '重新进入靶点评估', allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN] }
    ],
    [TaskStatus.PENDING_DIRECTOR_APPROVAL]: [
      { targetStatus: TaskStatus.COMPLETED, label: '主任审批通过，任务完成', allowedRoles: [RoleCode.DIRECTOR, RoleCode.ADMIN] },
      { targetStatus: TaskStatus.DIRECTOR_REJECTED, label: '主任驳回，返回修改', allowedRoles: [RoleCode.DIRECTOR, RoleCode.ADMIN] }
    ],
    [TaskStatus.DIRECTOR_REJECTED]: [
      { targetStatus: TaskStatus.PENDING_ENGINEER_APPROVAL, label: '重新提交工程师审批', allowedRoles: [RoleCode.ENGINEER, RoleCode.ADMIN] }
    ],
    [TaskStatus.COMPLETED]: [
      { targetStatus: TaskStatus.PUSHING_TO_NAVIGATION, label: '推送至实验室导航系统', allowedRoles: [RoleCode.TECHNICIAN, RoleCode.ADMIN] }
    ]
  };

  const all = transitionsMap[status] || [];
  return all.filter((t) => t.allowedRoles.includes(roleCode));
}
