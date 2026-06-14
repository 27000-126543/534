import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Activity,
  AlertTriangle,
  FileCheck,
  Target,
  TrendingUp,
  Users,
  Clock,
  ChevronRight,
  Zap,
  Shield,
  Award
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useAnalyticsStore, useTaskStore, useAlertStore, useApprovalStore } from '@/store';
import { TaskStatusColor, TaskStatusText } from 'shared/types/enums';
import type { TaskSummary } from 'shared/types/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const fetchDashboard = useAnalyticsStore((s) => s.fetchDashboard);
  const summary = useAnalyticsStore((s) => s.summary);
  const trends = useAnalyticsStore((s) => s.trends);
  const radar = useAnalyticsStore((s) => s.radar);
  const taskDistribution = useAnalyticsStore((s) => s.taskDistribution);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const tasks = useTaskStore((s) => s.tasks);
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);
  const alerts = useAlertStore((s) => s.alerts);
  const fetchApprovals = useApprovalStore((s) => s.fetchApprovals);
  const approvals = useApprovalStore((s) => s.approvals);

  useEffect(() => {
    fetchDashboard();
    fetchTasks({ pageSize: 5 });
    fetchAlerts({ pageSize: 5, isResolved: false });
    fetchApprovals({ pageSize: 5, status: 'pending' });
  }, [fetchDashboard, fetchTasks, fetchAlerts, fetchApprovals]);

  const mockSummary = summary || {
    totalTasks: 156,
    completedTasks: 128,
    completionRate: 82.1,
    avgAccuracy: 94.7,
    avgCoverage: 89.3,
    alertCount: 7,
    pendingApprovals: 12,
    avgComputationTime: 23.5
  };

  const mockTrends = trends || {
    dates: ['06/08', '06/09', '06/10', '06/11', '06/12', '06/13', '06/14'],
    taskCounts: [18, 22, 25, 20, 28, 24, 19],
    completedCounts: [15, 20, 22, 18, 25, 20, 16],
    accuracyTrend: [93.2, 94.1, 93.8, 95.2, 94.5, 95.0, 94.7],
    coverageTrend: [88.1, 88.9, 89.5, 88.7, 90.1, 89.6, 89.3],
    alertTrend: [1, 2, 0, 1, 2, 1, 0]
  };

  const mockRadar = radar || {
    categories: ['定位精度', '靶点覆盖率', '聚焦指数', '计算效率', '临床有效率', '专家满意度'],
    current: [94.7, 89.3, 87.5, 91.2, 88.6, 92.0],
    target: [95, 90, 90, 90, 90, 90]
  };

  const mockDistribution = taskDistribution || {
    statuses: ['已完成', '计算中', '待审批', '预警', '异常'],
    counts: [128, 18, 12, 5, 3],
    colors: ['#26A69A', '#42A5F5', '#FF9800', '#EF5350', '#D32F2F']
  };

  const mockTasks: TaskSummary[] = tasks.length > 0 ? tasks : [
    {
      id: '1',
      taskNo: 'TSK-2024015',
      patient: { id: 'p1', medicalRecordNo: 'MR001', name: '张某某', gender: '男', age: 45, diagnosis: '抑郁症', isSuspended: false },
      createdBy: { id: 'u1', username: 'eng1', fullName: '李工程师', title: '临床工程师', roleCode: 'engineer' as any, roleName: '临床工程师' },
      status: 'source_inverting' as any,
      statusText: '源反演计算中',
      algorithmType: 'sloreta' as any,
      algorithmTypeText: 'sLORETA',
      progress: 65,
      createdAt: '2024-06-14T08:30:00Z',
      updatedAt: '2024-06-14T09:15:00Z'
    },
    {
      id: '2',
      taskNo: 'TSK-2024014',
      patient: { id: 'p2', medicalRecordNo: 'MR002', name: '王某某', gender: '女', age: 38, diagnosis: '强迫症', isSuspended: false },
      createdBy: { id: 'u1', username: 'eng1', fullName: '李工程师', title: '临床工程师', roleCode: 'engineer' as any, roleName: '临床工程师' },
      status: 'pending_engineer_approval' as any,
      statusText: '待工程师审批',
      algorithmType: 'beamforming' as any,
      algorithmTypeText: 'Beamforming',
      progress: 100,
      createdAt: '2024-06-14T07:10:00Z',
      updatedAt: '2024-06-14T08:45:00Z'
    },
    {
      id: '3',
      taskNo: 'TSK-2024013',
      patient: { id: 'p3', medicalRecordNo: 'MR003', name: '李某某', gender: '男', age: 52, diagnosis: '精神分裂症', isSuspended: false },
      createdBy: { id: 'u2', username: 'eng2', fullName: '王工程师', title: '临床工程师', roleCode: 'engineer' as any, roleName: '临床工程师' },
      status: 'completed' as any,
      statusText: '已完成',
      algorithmType: 'mnls' as any,
      algorithmTypeText: 'MNLS',
      progress: 100,
      createdAt: '2024-06-13T16:20:00Z',
      updatedAt: '2024-06-13T18:50:00Z'
    },
    {
      id: '4',
      taskNo: 'TSK-2024012',
      patient: { id: 'p4', medicalRecordNo: 'MR004', name: '赵某某', gender: '女', age: 29, diagnosis: '焦虑障碍', isSuspended: false },
      createdBy: { id: 'u1', username: 'eng1', fullName: '李工程师', title: '临床工程师', roleCode: 'engineer' as any, roleName: '临床工程师' },
      status: 'abnormal_fallback' as any,
      statusText: '异常回退',
      algorithmType: 'sloreta' as any,
      algorithmTypeText: 'sLORETA',
      progress: 78,
      createdAt: '2024-06-13T14:00:00Z',
      updatedAt: '2024-06-13T16:30:00Z'
    },
    {
      id: '5',
      taskNo: 'TSK-2024011',
      patient: { id: 'p5', medicalRecordNo: 'MR005', name: '陈某某', gender: '男', age: 61, diagnosis: '帕金森病', isSuspended: false },
      createdBy: { id: 'u2', username: 'eng2', fullName: '王工程师', title: '临床工程师', roleCode: 'engineer' as any, roleName: '临床工程师' },
      status: 'target_evaluating' as any,
      statusText: '靶点评估中',
      algorithmType: 'dics' as any,
      algorithmTypeText: 'DICS',
      progress: 85,
      createdAt: '2024-06-13T10:30:00Z',
      updatedAt: '2024-06-13T13:00:00Z'
    }
  ];

  const statsCards = [
    {
      title: '总任务数',
      value: mockSummary.totalTasks,
      icon: Activity,
      color: 'from-blue-500 to-cyan-500',
      trend: '+12%',
      trendUp: true,
      subtitle: '本周新增'
    },
    {
      title: '完成率',
      value: `${mockSummary.completionRate}%`,
      icon: Award,
      color: 'from-emerald-500 to-teal-500',
      trend: '+2.3%',
      trendUp: true,
      subtitle: '较上周'
    },
    {
      title: '平均定位精度',
      value: `${mockSummary.avgAccuracy}%`,
      icon: Target,
      color: 'from-purple-500 to-pink-500',
      trend: '+0.6%',
      trendUp: true,
      subtitle: '目标 95%'
    },
    {
      title: '平均靶点覆盖',
      value: `${mockSummary.avgCoverage}%`,
      icon: Shield,
      color: 'from-amber-500 to-orange-500',
      trend: '+1.1%',
      trendUp: true,
      subtitle: '目标 90%'
    },
    {
      title: '待处理预警',
      value: alerts.length > 0 ? alerts.length : mockSummary.alertCount,
      icon: AlertTriangle,
      color: 'from-red-500 to-rose-500',
      trend: '-3',
      trendUp: false,
      subtitle: '较昨日'
    },
    {
      title: '待审批',
      value: approvals.length > 0 ? approvals.length : mockSummary.pendingApprovals,
      icon: FileCheck,
      color: 'from-indigo-500 to-blue-500',
      trend: '+2',
      trendUp: false,
      subtitle: '今日新增'
    }
  ];

  const trendOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#475569',
      textStyle: { color: '#e2e8f0', fontSize: 12 }
    },
    legend: {
      data: ['任务数', '完成数', '精度趋势'],
      top: 0,
      right: 10,
      textStyle: { color: '#cbd5e1', fontSize: 11 }
    },
    grid: { left: 50, right: 50, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: mockTrends.dates,
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      splitLine: { show: false }
    },
    yAxis: [
      {
        type: 'value',
        name: '数量',
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      {
        type: 'value',
        name: '精度(%)',
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        min: 85,
        max: 100,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '任务数',
        type: 'bar',
        barWidth: 16,
        itemStyle: { color: 'rgba(66, 165, 245, 0.6)', borderRadius: [4, 4, 0, 0] },
        data: mockTrends.taskCounts
      },
      {
        name: '完成数',
        type: 'bar',
        barWidth: 16,
        itemStyle: { color: 'rgba(38, 166, 154, 0.6)', borderRadius: [4, 4, 0, 0] },
        data: mockTrends.completedCounts
      },
      {
        name: '精度趋势',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: '#EF5350' },
        itemStyle: { color: '#EF5350', borderColor: '#fff', borderWidth: 2 },
        data: mockTrends.accuracyTrend
      }
    ]
  };

  const radarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#475569',
      textStyle: { color: '#e2e8f0', fontSize: 12 }
    },
    legend: {
      data: ['当前水平', '目标值'],
      bottom: 0,
      textStyle: { color: '#cbd5e1', fontSize: 11 }
    },
    radar: {
      indicator: mockRadar.categories.map((c) => ({ name: c, max: 100 })),
      radius: '65%',
      center: ['50%', '48%'],
      axisName: { color: '#94a3b8', fontSize: 11 },
      splitLine: { lineStyle: { color: '#334155' } },
      splitArea: {
        areaStyle: {
          color: ['rgba(30, 41, 59, 0.5)', 'rgba(51, 65, 85, 0.3)']
        }
      },
      axisLine: { lineStyle: { color: '#475569' } }
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: mockRadar.current,
            name: '当前水平',
            lineStyle: { width: 2, color: '#42A5F5' },
            itemStyle: { color: '#42A5F5' },
            areaStyle: { color: 'rgba(66, 165, 245, 0.25)' }
          },
          {
            value: mockRadar.target,
            name: '目标值',
            lineStyle: { width: 2, color: '#26A69A', type: 'dashed' },
            itemStyle: { color: '#26A69A' },
            areaStyle: { color: 'rgba(38, 166, 154, 0.1)' }
          }
        ]
      }
    ]
  };

  const distributionOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#475569',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#cbd5e1', fontSize: 11 }
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#0f172a',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 'bold',
            color: '#fff'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        labelLine: { show: false },
        data: mockDistribution.statuses.map((s, i) => ({
          value: mockDistribution.counts[i],
          name: s,
          itemStyle: { color: mockDistribution.colors[i] }
        }))
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">欢迎使用 NeuroSource 平台</h2>
          <p className="text-sm text-slate-400 mt-1">高精度脑电图源定位与经颅磁刺激靶点优化</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Clock className="w-4 h-4" /> 最近 7 天
          </button>
          <button
            onClick={() => navigate('/tasks')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" /> 新建任务
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className={`text-xs font-medium ${card.trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {card.trend}
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <div className="text-sm text-slate-300 mt-0.5">{card.title}</div>
              <div className="text-xs text-slate-500 mt-1">{card.subtitle}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">性能趋势</h3>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> 近 7 天
            </span>
          </div>
          <ReactECharts option={trendOption} style={{ height: 280 }} opts={{ renderer: 'canvas' }} />
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-semibold text-white mb-4">临床有效性雷达图</h3>
          <ReactECharts option={radarOption} style={{ height: 280 }} opts={{ renderer: 'canvas' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-semibold text-white mb-4">任务状态分布</h3>
          <ReactECharts option={distributionOption} style={{ height: 260 }} opts={{ renderer: 'canvas' }} />
        </div>

        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">最近任务</h3>
            <button
              onClick={() => navigate('/tasks')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              查看全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-800">
            {mockTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="p-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{task.taskNo}</span>
                        <span
                          className="px-2 py-0.5 text-[10px] rounded-full font-medium"
                          style={{
                            backgroundColor: `${TaskStatusColor[task.status]}20`,
                            color: TaskStatusColor[task.status]
                          }}
                        >
                          {TaskStatusText[task.status]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {task.patient.name} · {task.algorithmTypeText}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>进度</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${task.progress}%`,
                            backgroundColor: TaskStatusColor[task.status]
                          }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" /> 最近预警
            </h3>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              查看全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {alerts.slice(0, 4).map((alert, i) => (
              <div key={alert.id || i} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{alert.alertTypeText || '拟合残差超限'}</div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">
                    {alert.taskNo || 'TSK-2024015'} · 实际值 {(alert.actualValue || 12.3).toFixed(1)}
                    {alert.unit || '%'} / 阈值 {alert.threshold || 10}
                    {alert.unit || '%'}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                  {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '刚刚'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-400" /> 待审批任务
            </h3>
            <button
              onClick={() => navigate('/approvals')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              查看全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {approvals.slice(0, 4).map((approval, i) => (
              <div key={approval.id || i} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">
                    {approval.approvalLevelText || `第 ${approval.approvalLevel || 1} 级审批`}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">
                    任务 ID: {approval.taskId || 'TSK-2024014'} · 提交人: {approval.approver?.fullName || '李工程师'}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                  {approval.createdAt ? new Date(approval.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '2小时前'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
