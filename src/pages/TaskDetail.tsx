import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Brain,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  Play,
  RefreshCw,
  ChevronRight,
  Zap,
  Shield,
  User,
  Settings,
  TrendingUp,
  Layers,
  Radio,
  Gauge,
  FileCheck,
  Send,
  Bot,
  Loader2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import {
  HeadModelScene,
  VisualizationControls
} from '@/components/visualization';
import {
  SourceTimeSeriesChart,
  FrequencySpectrumChart,
  ResidualMonitorChart,
  ConfidenceEllipse2D
} from '@/components/charts';
import { useTaskStore, useApprovalStore, useAlertStore, useUIStore, useAuthStore } from '@/store';
import { workflowAPI, reportsAPI } from '@/services/api';
import {
  TaskStatus,
  TaskStatusColor,
  TaskStatusText,
  AlgorithmTypeText,
  AlertSeverityColor,
  AlertSeverityText,
  AlertTypeText,
  ApprovalStatusText,
  BrainRegionText,
  StimulationPatternText,
  RoleCode
} from 'shared/types/enums';
import type { TaskDetailResponse, MonitoringMetric } from 'shared/types/api';

const workflowSteps = [
  { key: TaskStatus.PENDING_VALIDATION, label: '待校验', icon: CheckCircle2 },
  { key: TaskStatus.HEAD_MODEL_BUILDING, label: '头模型构建', icon: Layers },
  { key: TaskStatus.FORWARD_COMPUTING, label: '正问题计算', icon: Activity },
  { key: TaskStatus.SOURCE_INVERTING, label: '源反演', icon: Brain },
  { key: TaskStatus.TARGET_EVALUATING, label: '靶点评估', icon: Target },
  { key: TaskStatus.PENDING_ENGINEER_APPROVAL, label: '工程师审批', icon: Shield },
  { key: TaskStatus.PENDING_DIRECTOR_APPROVAL, label: '主任审批', icon: FileCheck },
  { key: TaskStatus.COMPLETED, label: '已完成', icon: CheckCircle2 }
];

const mockTask: TaskDetailResponse = {
  id: '1',
  taskNo: 'TSK-2024015',
  taskName: '左侧DLPFC抑郁症精准定位',
  patient: {
    id: 'p1',
    medicalRecordNo: 'MR001',
    name: '张某某',
    gender: '男',
    age: 45,
    diagnosis: '重度抑郁症',
    isSuspended: false
  },
  createdBy: {
    id: 'u1',
    username: 'eng1',
    fullName: '李工程师',
    title: '临床工程师',
    roleCode: RoleCode.ENGINEER,
    roleName: '临床工程师'
  },
  status: TaskStatus.SOURCE_INVERTING,
  statusText: '源反演计算中',
  algorithmType: 'sloreta' as any,
  algorithmTypeText: 'sLORETA',
  algorithmParams: {
    regularizationParam: 0.05,
    timeWindow: 100,
    overlap: 50,
    maxIterations: 1000,
    convergenceThreshold: 1e-6
  },
  targetBrainRegion: 'left_dlpfc' as any,
  targetBrainRegionText: '左侧背外侧前额叶',
  currentPhase: 'source_inverting',
  progress: 65,
  notes: '患者MDD-III型，药物反应不佳，建议高聚焦度方案',
  timeline: [],
  approvals: [],
  alerts: [],
  pushToNavigation: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockMetrics: MonitoringMetric[] = Array.from({ length: 60 }, (_, i) => ({
  id: `m${i}`,
  timeWindow: i + 1,
  timeRange: [i * 100, (i + 1) * 100],
  residualError: i === 22 ? 12.3 : i === 45 ? 10.8 : 3 + Math.random() * 5,
  sourceCenter: [
    -20 + Math.random() * 3,
    35 + Math.random() * 3,
    40 + Math.random() * 3
  ] as [number, number, number],
  offsetFromPrevious: i === 30 ? 6.2 : i === 31 ? 5.8 : Math.random() * 3,
  isAlertTriggered: i === 22 || i === 45 || i === 30,
  alertType: i === 22 ? ('residual_exceeded' as any) : i === 45 ? ('residual_exceeded' as any) : i === 30 ? ('source_offset_exceeded' as any) : undefined,
  createdAt: new Date(Date.now() + i * 1000).toISOString()
}));

interface ValidTransition {
  targetStatus: TaskStatus;
  label: string;
  allowedRoles: RoleCode[];
}

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const fetchTaskDetail = useTaskStore((s) => s.fetchTaskDetail);
  const currentTask = useTaskStore((s) => s.currentTask);
  const isDetailLoading = useTaskStore((s) => s.isDetailLoading);
  const progress = useTaskStore((s) => s.progress);
  const progressMessage = useTaskStore((s) => s.progressMessage);
  const taskError = useTaskStore((s) => s.error);
  const buildHeadModel = useTaskStore((s) => s.buildHeadModel);
  const solveForward = useTaskStore((s) => s.solveForward);
  const solveSource = useTaskStore((s) => s.solveSource);
  const optimizeTarget = useTaskStore((s) => s.optimizeTarget);
  const transitionStatus = useTaskStore((s) => s.transitionStatus);
  const processApproval = useApprovalStore((s) => s.processApproval);
  const approvalError = useApprovalStore((s) => s.error);
  const approvalLoading = useApprovalStore((s) => s.isLoading);
  const showNotification = useUIStore((s) => s.showNotification);
  const hasRole = useAuthStore((s) => s.hasRole);

  const [activeTab, setActiveTab] = useState<'visualization' | 'timeseries' | 'spectrum' | 'monitoring' | 'confidence'>('visualization');
  const [sourceTimeWindow, setSourceTimeWindow] = useState(30);
  const [validTransitions, setValidTransitions] = useState<ValidTransition[]>([]);
  const [loadingTransitions, setLoadingTransitions] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const task = currentTask || mockTask;
  const metrics = mockMetrics;

  const isEngineer = hasRole([RoleCode.ENGINEER, RoleCode.ADMIN]);
  const isDirector = hasRole([RoleCode.DIRECTOR, RoleCode.ADMIN]);
  const isExpert = hasRole([RoleCode.EXPERT, RoleCode.CHIEF_SCIENTIST, RoleCode.ADMIN]);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail(taskId);
    }
  }, [taskId, fetchTaskDetail]);

  useEffect(() => {
    if (taskId) {
      setLoadingTransitions(true);
      workflowAPI.getValidTransitions(taskId)
        .then((res) => {
          setValidTransitions(res.data?.validTransitions || []);
        })
        .catch((err) => {
          console.error('获取状态流转失败:', err);
          setValidTransitions([]);
        })
        .finally(() => setLoadingTransitions(false));
    }
  }, [taskId, task.status]);

  const currentStepIndex = workflowSteps.findIndex((s) => s.key === task.status);

  const refreshTask = async () => {
    if (taskId) await fetchTaskDetail(taskId);
    showNotification('任务状态已刷新', 'info');
  };

  const runComputationStep = async (step: 'head' | 'forward' | 'source' | 'target') => {
    if (!taskId) return;
    try {
      showNotification(`正在执行${step === 'head' ? '头模型构建' : step === 'forward' ? '正问题计算' : step === 'source' ? '源反演' : '靶点评估'}...`, 'info');
      if (step === 'head') await buildHeadModel(taskId);
      if (step === 'forward') await solveForward(taskId);
      if (step === 'source') await solveSource(taskId);
      if (step === 'target') await optimizeTarget(taskId);
      showNotification('计算步骤执行成功', 'success');
      await fetchTaskDetail(taskId);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || '计算执行失败';
      showNotification(msg, 'error');
    }
  };

  const handleTransition = async (transition: ValidTransition) => {
    if (!taskId) return;
    try {
      showNotification(`正在执行：${transition.label}`, 'info');
      await transitionStatus(taskId, transition.targetStatus);
      showNotification('状态流转成功', 'success');
      await fetchTaskDetail(taskId);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || '状态流转失败';
      showNotification(msg, 'error');
    }
  };

  const handleApproval = async (approvalId: string, approvalLevel: 1 | 2, approved: boolean) => {
    if (!taskId) return;
    try {
      const comment = approved ? `${approvalLevel === 1 ? '工程师' : '主任'}审批通过` : '需要修改';
      await processApproval(approvalId, approved, comment);
      showNotification(`审批${approved ? '通过' : '驳回'}成功`, 'success');
      await fetchTaskDetail(taskId);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || '审批处理失败';
      showNotification(msg, 'error');
    }
  };

  const handleGenerateAndDownloadReport = async () => {
    if (!taskId) return;
    try {
      setGeneratingReport(true);
      showNotification('正在生成综合报告...', 'info');
      const genRes = await reportsAPI.generateReport(taskId);
      const reportId = genRes.data?.reportId || 'rep_default';

      setDownloadingReport(true);
      const dlRes = await reportsAPI.downloadReport(reportId);
      const blob = new Blob([dlRes.data as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NeuroGuide_Report_${task.taskNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('综合报告已下载成功', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || '报告生成失败';
      showNotification(msg, 'error');
    } finally {
      setGeneratingReport(false);
      setDownloadingReport(false);
    }
  };

  const StatusBadge = ({ status }: { status: TaskStatus | string }) => (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: (TaskStatusColor as any)[status] + '20',
        color: (TaskStatusColor as any)[status]
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ backgroundColor: (TaskStatusColor as any)[status] }}
      />
      {(TaskStatusText as any)[status]}
    </span>
  );

  return (
    <div className="p-6 space-y-6">
      {(taskError || approvalError) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-red-800">操作遇到问题</div>
            <div className="text-sm text-red-600 mt-1">{taskError || approvalError}</div>
          </div>
          <button
            onClick={() => { useTaskStore.getState().clearError(); useApprovalStore.getState().clearError(); }}
            className="text-red-400 hover:text-red-600"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tasks')}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{task.taskNo}</h1>
              <StatusBadge status={task.status} />
              {isDetailLoading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{task.taskName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={refreshTask}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            刷新状态
          </button>
          <button
            onClick={handleGenerateAndDownloadReport}
            disabled={generatingReport || downloadingReport || task.progress < 100}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
          >
            {(generatingReport || downloadingReport) ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {generatingReport ? '生成报告中...' : downloadingReport ? '下载中...' : '生成并下载综合报告'}
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            导出数据
          </button>
        </div>
      </div>

      {validTransitions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              可执行的下一步操作
            </h3>
            {loadingTransitions && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          </div>
          <div className="flex flex-wrap gap-2">
            {validTransitions.map((t, i) => (
              <button
                key={i}
                onClick={() => handleTransition(t)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                {t.label}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">计算工作流</h3>
              <div className="flex items-center gap-1">
                {task.status === TaskStatus.PENDING_VALIDATION && (
                  <button onClick={() => runComputationStep('head')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                    开始：构建头模型
                  </button>
                )}
                {task.status === TaskStatus.HEAD_MODEL_BUILDING && (
                  <button onClick={() => runComputationStep('forward')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                    下一步：正问题求解
                  </button>
                )}
                {task.status === TaskStatus.FORWARD_COMPUTING && (
                  <button onClick={() => runComputationStep('source')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                    下一步：源反演
                  </button>
                )}
                {task.status === TaskStatus.SOURCE_INVERTING && (
                  <button onClick={() => runComputationStep('target')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                    下一步：靶点评估
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 mx-8" />
              <div
                className="absolute top-4 left-0 h-0.5 bg-blue-500 mx-8 transition-all"
                style={{ width: `calc(${(Math.max(0, currentStepIndex) / (workflowSteps.length - 1)) * 100}% - 4rem)` }}
              />
              {workflowSteps.map((step, i) => {
                const Icon = step.icon;
                const isDone = currentStepIndex > i || (task.status === TaskStatus.COMPLETED);
                const isCurrent = currentStepIndex === i;
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        isDone
                          ? 'bg-green-500 border-green-500 text-white'
                          : isCurrent
                          ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs font-medium ${isCurrent ? 'text-blue-600' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {(task.status === TaskStatus.SOURCE_INVERTING || task.status === TaskStatus.HEAD_MODEL_BUILDING || task.status === TaskStatus.FORWARD_COMPUTING) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">
                    {progressMessage || (task.status === TaskStatus.SOURCE_INVERTING ? '正在进行源反演迭代计算...' : '正在处理...')}
                  </span>
                  <span className="font-medium text-blue-600">{task.progress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-5">
              <div className="flex gap-1">
                {[
                  { key: 'visualization', label: '3D脑图', icon: Brain },
                  { key: 'timeseries', label: '源活动时序', icon: Activity },
                  { key: 'spectrum', label: '频率谱分析', icon: Radio },
                  { key: 'monitoring', label: '实时监控', icon: Gauge },
                  { key: 'confidence', label: '置信椭圆', icon: Target }
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key as any)}
                      className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === t.key
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-4">
              {activeTab === 'visualization' && (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-9">
                    <div className="aspect-[4/3] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl overflow-hidden">
                      <HeadModelScene
                        showScalp={true}
                        showSkull={true}
                        showBrain={true}
                        showElectrodes={true}
                        showDipole={task.progress >= 60}
                        showCoil={task.progress >= 85}
                        showConfidenceEllipsoid={task.progress >= 70}
                        currentDensityTime={sourceTimeWindow}
                      />
                    </div>
                  </div>
                  <div className="col-span-3">
                    <VisualizationControls
                      showScalp={true}
                      showSkull={true}
                      showBrain={true}
                      showElectrodes={true}
                      showDipole={task.progress >= 60}
                      showCoil={task.progress >= 85}
                      showWireframe={false}
                      scalpOpacity={0.3}
                      brainOpacity={0.9}
                      currentTimeWindow={sourceTimeWindow}
                      totalTimeWindows={100}
                      onShowScalpChange={() => {}}
                      onShowSkullChange={() => {}}
                      onShowBrainChange={() => {}}
                      onShowElectrodesChange={() => {}}
                      onShowDipoleChange={() => {}}
                      onShowCoilChange={() => {}}
                      onShowWireframeChange={() => {}}
                      onScalpOpacityChange={() => {}}
                      onBrainOpacityChange={() => {}}
                      onTimeWindowChange={(v) => setSourceTimeWindow(v)}
                    />
                  </div>
                </div>
              )}
              {activeTab === 'timeseries' && (
                <div className="h-[420px]">
                  <SourceTimeSeriesChart />
                </div>
              )}
              {activeTab === 'spectrum' && (
                <div className="h-[420px]">
                  <FrequencySpectrumChart highlightRegion="left_dlpfc" highlightBand="alpha" />
                </div>
              )}
              {activeTab === 'monitoring' && (
                <div className="h-[420px]">
                  <ResidualMonitorChart metrics={metrics} />
                </div>
              )}
              {activeTab === 'confidence' && task.sourceResult && (
                <div className="h-[420px]">
                  <ConfidenceEllipse2D
                    dipolePosition={task.sourceResult.dipoleParameters.position as [number, number, number]}
                    dipoleMoment={task.sourceResult.dipoleParameters.moment as [number, number, number]}
                    goodnessOfFit={task.sourceResult.dipoleParameters.goodnessOfFit}
                    confidenceLevel90={{ center: task.sourceResult.confidenceEllipsoid.center as [number, number, number], radii: [task.sourceResult.confidenceEllipsoid.radii[0] * 0.78, task.sourceResult.confidenceEllipsoid.radii[1] * 0.78, task.sourceResult.confidenceEllipsoid.radii[2] * 0.78], rotation: task.sourceResult.confidenceEllipsoid.rotation as number[][] }}
                    confidenceLevel95={{ center: task.sourceResult.confidenceEllipsoid.center as [number, number, number], radii: task.sourceResult.confidenceEllipsoid.radii as [number, number, number], rotation: task.sourceResult.confidenceEllipsoid.rotation as number[][] }}
                    confidenceLevel99={{ center: task.sourceResult.confidenceEllipsoid.center as [number, number, number], radii: [task.sourceResult.confidenceEllipsoid.radii[0] * 1.4, task.sourceResult.confidenceEllipsoid.radii[1] * 1.4, task.sourceResult.confidenceEllipsoid.radii[2] * 1.4], rotation: task.sourceResult.confidenceEllipsoid.rotation as number[][] }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              患者信息
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold">
                {task.patient.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{task.patient.name}</div>
                <div className="text-sm text-gray-500">{task.patient.medicalRecordNo}</div>
              </div>
              {task.patient.isSuspended && (
                <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                  已暂停
                </span>
              )}
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">性别</span>
                <span className="text-gray-900">{task.patient.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">年龄</span>
                <span className="text-gray-900">{task.patient.age}岁</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">诊断</span>
                <span className="text-gray-900">{task.patient.diagnosis}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              算法与参数
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">算法类型</span>
                <span className="text-gray-900 font-medium">{task.algorithmTypeText}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">正则化参数</span>
                <span className="text-gray-900">{task.algorithmParams.regularizationParam}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">时间窗</span>
                <span className="text-gray-900">{task.algorithmParams.timeWindow}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">重叠率</span>
                <span className="text-gray-900">{task.algorithmParams.overlap}%</span>
              </div>
              {task.targetBrainRegion && (
                <div className="flex justify-between">
                  <span className="text-gray-500">目标脑区</span>
                  <span className="text-gray-900 font-medium">{task.targetBrainRegionText}</span>
                </div>
              )}
              {task.sourceResult && (
                <>
                  <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between">
                    <span className="text-gray-500">平均残差</span>
                    <span className={task.sourceResult.meanResidual > 10 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {task.sourceResult.meanResidual.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">空间精度</span>
                    <span className="text-gray-900 font-medium">{task.sourceResult.sourceSpatialAccuracy.toFixed(2)}mm</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {task.targetPlan && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                TMS靶点方案
                {task.targetPlan.isAIRecommended && (
                  <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    <Bot className="w-3 h-3" />
                    AI推荐
                  </span>
                )}
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">靶点坐标</span>
                  <span className="text-gray-900 font-mono">
                    ({task.targetPlan.coilPosition.map((v) => v.toFixed(1)).join(', ')})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">线圈角度</span>
                  <span className="text-gray-900">{task.targetPlan.coilOrientation.angleDegrees.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">电流强度</span>
                  <span className="text-gray-900 font-medium">{task.targetPlan.currentIntensity.toFixed(1)} A/m²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">刺激模式</span>
                  <span className="text-gray-900">{task.targetPlan.pulsePatternText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">脉冲数量</span>
                  <span className="text-gray-900">{task.targetPlan.pulseCount}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-blue-200">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">聚焦指数</span>
                    <span className="text-blue-700 font-semibold">{(task.targetPlan.focalityIndex * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${task.targetPlan.focalityIndex * 100}%` }} />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">靶区覆盖</span>
                  <span className="text-green-600 font-medium">{(task.targetPlan.targetCoverage * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          {task.alerts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                预警信息
                <span className="ml-auto text-xs text-gray-500">{task.alerts.filter(a => !a.isResolved).length} 未处理</span>
              </h3>
              <div className="space-y-3">
                {task.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.isResolved ? 'bg-gray-50 border-gray-200' : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{ color: (AlertSeverityColor as any)[alert.severity] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{alert.alertTypeText}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: (AlertSeverityColor as any)[alert.severity] + '20',
                              color: (AlertSeverityColor as any)[alert.severity]
                            }}
                          >
                            {(AlertSeverityText as any)[alert.severity]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                        {!alert.isResolved && (
                          <p className="text-xs text-blue-600 mt-1">建议：{alert.suggestion}</p>
                        )}
                        <div className="text-xs text-gray-400 mt-1.5">
                          {new Date(alert.createdAt).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              审批流程
              {approvalLoading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin ml-auto" />}
            </h3>
            <div className="space-y-3">
              {task.approvals.map((app, idx) => (
                <div key={app.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                        app.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : app.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    {idx < task.approvals.length - 1 && (
                      <div className="w-px h-6 bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{app.approvalLevelText}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          app.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : app.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {(ApprovalStatusText as any)[app.status]}
                      </span>
                    </div>
                    {app.approver && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {app.approver.fullName} · {app.approver.title}
                      </div>
                    )}
                    {app.comment && (
                      <div className="text-xs text-gray-600 mt-1 bg-gray-50 rounded p-2">
                        {app.comment}
                      </div>
                    )}
                    {app.status === 'pending' &&
                      ((idx === 0 && isEngineer) || (idx === 1 && isDirector)) &&
                      task.progress === 100 && (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleApproval(app.id, app.approvalLevel, true)}
                            disabled={approvalLoading}
                            className="text-xs px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-60 inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            通过
                          </button>
                          <button
                            onClick={() => handleApproval(app.id, app.approvalLevel, false)}
                            disabled={approvalLoading}
                            className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-60 inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            驳回
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              操作时间线
            </h3>
            <div className="space-y-3">
              {task.timeline.slice().reverse().map((event, idx) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    {idx < task.timeline.length - 1 && <div className="w-px h-8 bg-gray-200" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{event.toStatusText}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(event.createdAt).toLocaleString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {event.reason && <p className="text-xs text-gray-500 mt-0.5">{event.reason}</p>}
                    {event.operator && (
                      <p className="text-xs text-gray-400 mt-0.5">操作人：{event.operator.fullName}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
