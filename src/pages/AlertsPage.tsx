import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Clock,
  User,
  Eye,
  ExternalLink,
  Activity,
  Brain,
  Zap
} from 'lucide-react';
import { useAlertStore, useUIStore, useAuthStore } from '@/store';
import {
  AlertTypeText,
  AlertSeverity,
  AlertSeverityColor,
  AlertSeverityText,
  RoleCode
} from '../../../shared/types/enums';
import type { AlertData } from '../../../shared/types/api';

const mockAlerts: AlertData[] = [
  {
    id: 'al1',
    taskId: '1',
    taskNo: 'TSK-2024015',
    patientName: '张某某',
    alertType: 'residual_exceeded' as any,
    alertTypeText: '拟合残差超限',
    severity: 'warning' as any,
    severityText: '警告',
    threshold: 10,
    actualValue: 12.3,
    unit: '%',
    description: '第23时间窗偶极子拟合残差12.3%超过阈值10%，可能影响源定位精度',
    suggestion: '建议调整正则化参数至0.08或切换至Beamforming算法重新计算',
    isResolved: false,
    createdAt: '2024-06-14T09:12:00Z'
  },
  {
    id: 'al2',
    taskId: '2',
    taskNo: 'TSK-2024014',
    patientName: '王某某',
    alertType: 'source_offset_exceeded' as any,
    alertTypeText: '源中心偏移超限',
    severity: 'error' as any,
    severityText: '错误',
    threshold: 5,
    actualValue: 6.2,
    unit: 'mm',
    description: '第30-31时间窗源中心连续偏移6.2mm/5.8mm超过阈值5mm',
    suggestion: '建议增加时间窗长度或启用空间平滑约束',
    isResolved: false,
    createdAt: '2024-06-14T08:45:00Z'
  },
  {
    id: 'al3',
    taskId: '3',
    taskNo: 'TSK-2024012',
    patientName: '赵某某',
    alertType: 'patient_deviation' as any,
    alertTypeText: '患者偏差异常',
    severity: 'critical' as any,
    severityText: '严重',
    threshold: 8,
    actualValue: 9.2,
    unit: 'mm',
    description: '该患者连续3次定位源中心最大偏差9.2mm超过8mm阈值，患者任务已自动暂停',
    suggestion: '需首席科学家复核后决定是否恢复该患者任务',
    isResolved: false,
    createdAt: '2024-06-14T07:30:00Z'
  },
  {
    id: 'al4',
    taskId: '4',
    taskNo: 'TSK-2024010',
    patientName: '李某某',
    alertType: 'computation_timeout' as any,
    alertTypeText: '计算超时',
    severity: 'warning' as any,
    severityText: '警告',
    threshold: 600,
    actualValue: 725,
    unit: 's',
    description: '源反演计算耗时725s超过预期阈值600s',
    suggestion: '建议检查输入数据质量或减少源空间网格密度',
    isResolved: true,
    review: {
      id: 'r1',
      reviewer: {
        id: 'u2',
        username: 'exp1',
        fullName: '王专家',
        title: '神经电生理专家',
        roleCode: RoleCode.EXPERT,
        roleName: '神经电生理专家'
      },
      approved: true,
      reviewComment: '数据质量正常，已将正则化参数调至0.1后重新计算，结果正常',
      adjustmentType: 'parameter',
      newParams: { regularizationParam: 0.1 },
      createdAt: '2024-06-14T08:00:00Z'
    },
    createdAt: '2024-06-14T06:15:00Z',
    resolvedAt: '2024-06-14T08:00:00Z'
  },
  {
    id: 'al5',
    taskId: '5',
    taskNo: 'TSK-2024008',
    patientName: '陈某某',
    alertType: 'data_quality_issue' as any,
    alertTypeText: '数据质量问题',
    severity: 'warning' as any,
    severityText: '警告',
    threshold: 50,
    actualValue: 68,
    unit: 'μV',
    description: '脑电信号中检测到68μV眼电伪迹超过阈值，建议预处理',
    suggestion: '已自动执行ICA伪迹去除，请确认效果',
    isResolved: true,
    review: {
      id: 'r2',
      reviewer: {
        id: 'u3',
        username: 'exp2',
        fullName: '李专家',
        title: '神经电生理专家',
        roleCode: RoleCode.EXPERT,
        roleName: '神经电生理专家'
      },
      approved: true,
      reviewComment: 'ICA去除效果良好，可继续计算',
      adjustmentType: 'none',
      createdAt: '2024-06-13T18:20:00Z'
    },
    createdAt: '2024-06-13T18:00:00Z',
    resolvedAt: '2024-06-13T18:20:00Z'
  }
];

export default function AlertsPage() {
  const navigate = useNavigate();
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);
  const alerts = useAlertStore((s) => s.alerts);
  const isLoading = useAlertStore((s) => s.isLoading);
  const reviewAlert = useAlertStore((s) => s.reviewAlert);
  const openModal = useUIStore((s) => s.openModal);
  const hasRole = useAuthStore((s) => s.hasRole);

  const [searchText, setSearchText] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const isExpert = hasRole([RoleCode.EXPERT, RoleCode.CHIEF_SCIENTIST, RoleCode.ADMIN]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const displayAlerts = alerts.length > 0 ? alerts : mockAlerts;

  const filteredAlerts = displayAlerts.filter((a) => {
    const matchSearch =
      !searchText ||
      a.taskNo.toLowerCase().includes(searchText.toLowerCase()) ||
      a.patientName.includes(searchText) ||
      a.description.includes(searchText);
    const matchSeverity = severityFilter === 'all' || a.severity === severityFilter;
    const matchStatus =
      statusFilter === 'all' ? true : statusFilter === 'unresolved' ? !a.isResolved : a.isResolved;
    return matchSearch && matchSeverity && matchStatus;
  });

  const stats = {
    total: displayAlerts.length,
    unresolved: displayAlerts.filter((a) => !a.isResolved).length,
    critical: displayAlerts.filter((a) => a.severity === AlertSeverity.CRITICAL && !a.isResolved).length,
    error: displayAlerts.filter((a) => a.severity === AlertSeverity.ERROR && !a.isResolved).length
  };

  const SeverityIcon = ({ severity }: { severity: string }) => {
    if (severity === AlertSeverity.CRITICAL) return <XCircle className="w-5 h-5" />;
    if (severity === AlertSeverity.ERROR) return <AlertCircle className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">预警中心</h1>
          <p className="text-sm text-gray-500 mt-1">实时监控计算异常、处理预警并记录专家复核</p>
        </div>
        <button
          onClick={() => fetchAlerts()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">预警总数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待处理</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.unresolved}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">错误级</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{stats.error}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">严重级</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{stats.critical}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索任务编号、患者姓名、预警描述..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => {
                setShowSeverityDropdown(!showSeverityDropdown);
                setShowStatusDropdown(false);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[140px]"
            >
              <Filter className="w-4 h-4" />
              {severityFilter === 'all'
                ? '全部级别'
                : AlertSeverityText[severityFilter as keyof typeof AlertSeverityText]}
              <ChevronDown className="w-4 h-4 ml-auto" />
            </button>
            {showSeverityDropdown && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                {[
                  { value: 'all', label: '全部级别' },
                  { value: AlertSeverity.WARNING, label: '警告' },
                  { value: AlertSeverity.ERROR, label: '错误' },
                  { value: AlertSeverity.CRITICAL, label: '严重' }
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      setSeverityFilter(f.value);
                      setShowSeverityDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      severityFilter === f.value ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowSeverityDropdown(false);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[140px]"
            >
              <Filter className="w-4 h-4" />
              {statusFilter === 'all' ? '全部状态' : statusFilter === 'unresolved' ? '待处理' : '已处理'}
              <ChevronDown className="w-4 h-4 ml-auto" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                {[
                  { value: 'all', label: '全部状态' },
                  { value: 'unresolved', label: '待处理' },
                  { value: 'resolved', label: '已处理' }
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      setStatusFilter(f.value as any);
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      statusFilter === f.value ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-2">加载中...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">暂无预警数据</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border transition-colors ${
                alert.isResolved ? 'border-gray-200' : 'border-gray-200 shadow-sm hover:shadow'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: (AlertSeverityColor as any)[alert.severity] + '15',
                      color: (AlertSeverityColor as any)[alert.severity]
                    }}
                  >
                    <SeverityIcon severity={alert.severity} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {alert.alertTypeText}
                          </h3>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: (AlertSeverityColor as any)[alert.severity] + '20',
                              color: (AlertSeverityColor as any)[alert.severity]
                            }}
                          >
                            {alert.severityText}
                          </span>
                          {alert.isResolved ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                              已处理
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                              待处理
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Brain className="w-3 h-3" />
                            {alert.patientName}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {alert.taskNo}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(alert.createdAt).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-gray-500">实测值 / 阈值</div>
                        <div className="text-sm font-semibold mt-0.5">
                          <span style={{ color: (AlertSeverityColor as any)[alert.severity] }}>
                            {alert.actualValue}
                          </span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-gray-600">{alert.threshold}</span>
                          <span className="text-gray-400 ml-1">{alert.unit}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">{alert.description}</p>
                    {!alert.isResolved && (
                      <p className="text-sm text-blue-600 mt-2 bg-blue-50 rounded-lg p-3">
                        💡 {alert.suggestion}
                      </p>
                    )}
                    {alert.review && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-xs font-medium text-gray-700">
                            {alert.review.reviewer.fullName} · {alert.review.reviewer.title}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(alert.review.createdAt).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {alert.review.approved ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                              复核通过
                            </span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                              复核驳回
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{alert.review.reviewComment}</p>
                        {alert.review.adjustmentType !== 'none' && (
                          <div className="mt-2 text-xs text-gray-500">
                            调整类型：
                            {alert.review.adjustmentType === 'parameter' && '参数调整'}
                            {alert.review.adjustmentType === 'algorithm' && '算法切换'}
                            {alert.review.adjustmentType === 'both' && '参数+算法调整'}
                            {alert.review.newParams?.regularizationParam && (
                              <span className="ml-2">
                                正则化参数 → {alert.review.newParams.regularizationParam}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => navigate(`/tasks/${alert.taskId}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        查看任务
                      </button>
                      {!alert.isResolved && isExpert && (
                        <button
                          onClick={() => openModal('review-alert')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          <Zap className="w-4 h-4" />
                          专家复核
                        </button>
                      )}
                      <button className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <ExternalLink className="w-4 h-4" />
                        详情
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
