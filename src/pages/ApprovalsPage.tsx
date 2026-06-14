import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronDown,
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Loader2,
  RefreshCw,
  Shield,
  Eye,
  Send,
  ChevronRight,
  Brain,
  Activity
} from 'lucide-react';
import { useApprovalStore, useUIStore, useAuthStore } from '@/store';
import {
  ApprovalStatus,
  ApprovalStatusText,
  RoleCode
} from '../../../shared/types/enums';

type ApprovalLevel = 'all' | 1 | 2;

const mockApprovals = [
  {
    id: 'a1',
    taskId: '2',
    taskNo: 'TSK-2024014',
    taskName: '右侧DLPFC强迫症靶点定位',
    patientName: '王某某',
    patientDiagnosis: '强迫症',
    algorithmText: 'Beamforming',
    targetRegion: '右侧背外侧前额叶',
    approvalLevel: 1,
    approvalLevelText: '临床工程师审批',
    approver: null,
    status: 'pending',
    statusText: '待审批',
    comment: null,
    approvedAt: null,
    createdAt: '2024-06-14T08:45:00Z'
  },
  {
    id: 'a2',
    taskId: '5',
    taskNo: 'TSK-2024011',
    taskName: '左侧M1运动皮层精准定位',
    patientName: '陈某某',
    patientDiagnosis: '帕金森病',
    algorithmText: 'sLORETA',
    targetRegion: '初级运动皮层',
    approvalLevel: 1,
    approvalLevelText: '临床工程师审批',
    approver: null,
    status: 'pending',
    statusText: '待审批',
    comment: null,
    approvedAt: null,
    createdAt: '2024-06-14T07:20:00Z'
  },
  {
    id: 'a3',
    taskId: '6',
    taskNo: 'TSK-2024009',
    taskName: '双侧DLPFC双相情感障碍',
    patientName: '刘某某',
    patientDiagnosis: '双相情感障碍',
    algorithmText: 'MNLS',
    targetRegion: '双侧背外侧前额叶',
    approvalLevel: 2,
    approvalLevelText: '神经内科主任审批',
    approver: null,
    status: 'pending',
    statusText: '待审批',
    comment: null,
    approvedAt: null,
    createdAt: '2024-06-14T06:30:00Z'
  },
  {
    id: 'a4',
    taskId: '7',
    taskNo: 'TSK-2024007',
    taskName: '枕叶α波活动源定位',
    patientName: '吴某某',
    patientDiagnosis: '重度抑郁症',
    algorithmText: 'DICS',
    targetRegion: '枕叶',
    approvalLevel: 1,
    approvalLevelText: '临床工程师审批',
    approver: {
      id: 'u1',
      fullName: '李工程师',
      title: '临床工程师'
    },
    status: 'approved',
    statusText: '已通过',
    comment: '源定位结果可靠，偶极子拟合优度0.94，靶点聚焦指数89.2%，方案合理',
    approvedAt: '2024-06-13T18:00:00Z',
    createdAt: '2024-06-13T16:30:00Z'
  },
  {
    id: 'a5',
    taskId: '8',
    taskNo: 'TSK-2024006',
    taskName: 'SMA辅助运动区定位',
    patientName: '周某某',
    patientDiagnosis: '创伤后应激障碍',
    algorithmText: 'LORETA',
    targetRegion: '辅助运动区',
    approvalLevel: 1,
    approvalLevelText: '临床工程师审批',
    approver: {
      id: 'u4',
      fullName: '赵工程师',
      title: '临床工程师'
    },
    status: 'rejected',
    statusText: '已驳回',
    comment: '残差偏高(12.8%)，建议使用Beamforming算法或增加正则化参数后重新计算',
    approvedAt: '2024-06-13T15:20:00Z',
    createdAt: '2024-06-13T14:00:00Z'
  },
  {
    id: 'a6',
    taskId: '9',
    taskNo: 'TSK-2024005',
    taskName: '左侧颞叶癫痫灶定位',
    patientName: '孙某某',
    patientDiagnosis: '颞叶癫痫',
    algorithmText: 'sLORETA',
    targetRegion: '左侧颞叶',
    approvalLevel: 2,
    approvalLevelText: '神经内科主任审批',
    approver: {
      id: 'u5',
      fullName: '钱主任',
      title: '神经内科主任'
    },
    status: 'approved',
    statusText: '已通过',
    comment: '定位结果与临床症状高度吻合，TMS方案安全有效，同意开始治疗',
    approvedAt: '2024-06-13T11:00:00Z',
    createdAt: '2024-06-13T09:30:00Z'
  }
];

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const fetchApprovals = useApprovalStore((s) => s.fetchApprovals);
  const isLoading = useApprovalStore((s) => s.isLoading);
  const processApproval = useApprovalStore((s) => s.processApproval);
  const openModal = useUIStore((s) => s.openModal);
  const hasRole = useAuthStore((s) => s.hasRole);

  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<ApprovalLevel>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const isEngineer = hasRole([RoleCode.ENGINEER, RoleCode.ADMIN]);
  const isDirector = hasRole([RoleCode.DIRECTOR, RoleCode.ADMIN]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const filteredApprovals = mockApprovals.filter((a) => {
    const matchSearch =
      !searchText ||
      a.taskNo.toLowerCase().includes(searchText.toLowerCase()) ||
      a.patientName.includes(searchText) ||
      a.taskName.includes(searchText);
    const matchLevel = levelFilter === 'all' || a.approvalLevel === levelFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchLevel && matchStatus;
  });

  const stats = {
    total: mockApprovals.length,
    pending: mockApprovals.filter((a) => a.status === ApprovalStatus.PENDING).length,
    approved: mockApprovals.filter((a) => a.status === ApprovalStatus.APPROVED).length,
    rejected: mockApprovals.filter((a) => a.status === ApprovalStatus.REJECTED).length
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, { bg: string; text: string; icon: any }> = {
      [ApprovalStatus.PENDING]: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
      [ApprovalStatus.APPROVED]: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
      [ApprovalStatus.REJECTED]: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle }
    };
    const c = colors[status] || colors[ApprovalStatus.PENDING];
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {ApprovalStatusText[status as keyof typeof ApprovalStatusText]}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">审批中心</h1>
          <p className="text-sm text-gray-500 mt-1">两级审批流程管理：临床工程师验证→神经内科主任确认</p>
        </div>
        <button
          onClick={() => fetchApprovals()}
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
              <p className="text-sm text-gray-500">审批总数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待审批</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已通过</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已驳回</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
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
              placeholder="搜索任务编号、患者姓名、任务名称..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => {
                setShowLevelDropdown(!showLevelDropdown);
                setShowStatusDropdown(false);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[150px]"
            >
              <Shield className="w-4 h-4" />
              {levelFilter === 'all' ? '全部级别' : levelFilter === 1 ? '工程师审批' : '主任审批'}
              <ChevronDown className="w-4 h-4 ml-auto" />
            </button>
            {showLevelDropdown && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                {[
                  { value: 'all', label: '全部级别' },
                  { value: 1, label: '临床工程师审批' },
                  { value: 2, label: '神经内科主任审批' }
                ].map((f) => (
                  <button
                    key={String(f.value)}
                    onClick={() => {
                      setLevelFilter(f.value as ApprovalLevel);
                      setShowLevelDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      levelFilter === f.value ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
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
                setShowLevelDropdown(false);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[140px]"
            >
              <Filter className="w-4 h-4" />
              {statusFilter === 'all' ? '全部状态' : ApprovalStatusText[statusFilter as keyof typeof ApprovalStatusText]}
              <ChevronDown className="w-4 h-4 ml-auto" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                {[
                  { value: 'all', label: '全部状态' },
                  { value: ApprovalStatus.PENDING, label: '待审批' },
                  { value: ApprovalStatus.APPROVED, label: '已通过' },
                  { value: ApprovalStatus.REJECTED, label: '已驳回' }
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      setStatusFilter(f.value);
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
        ) : filteredApprovals.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileCheck className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">暂无审批数据</p>
          </div>
        ) : (
          filteredApprovals.map((app) => {
            const canApprove =
              app.status === ApprovalStatus.PENDING &&
              ((app.approvalLevel === 1 && isEngineer) || (app.approvalLevel === 2 && isDirector));
            return (
              <div key={app.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          app.approvalLevel === 1
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {app.approvalLevel}
                      </div>
                      <div className="w-px h-8 bg-gray-200 mt-1" />
                      <Shield
                        className={`w-4 h-4 ${
                          app.approvalLevel === 1 ? 'text-indigo-500' : 'text-purple-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-gray-900">{app.taskName}</h3>
                            <StatusBadge status={app.status} />
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {app.taskNo}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              {app.patientName}
                            </span>
                            <span className="text-gray-400">{app.patientDiagnosis}</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(app.createdAt).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-medium text-gray-900">{app.approvalLevelText}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {app.algorithmText} · {app.targetRegion}
                          </div>
                        </div>
                      </div>

                      {app.comment && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-xs font-medium text-gray-700">
                              {app.approver?.fullName || '未知'} · {app.approver?.title || ''}
                            </span>
                            {app.approvedAt && (
                              <span className="text-xs text-gray-400">
                                {new Date(app.approvedAt).toLocaleString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{app.comment}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => navigate(`/tasks/${app.taskId}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          查看定位结果
                        </button>
                        {canApprove && (
                          <>
                            <button
                              onClick={() => processApproval(app.id, true, '审批通过')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              通过
                            </button>
                            <button
                              onClick={() => openModal('process-approval')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              驳回
                            </button>
                          </>
                        )}
                        {app.status === ApprovalStatus.APPROVED && app.approvalLevel === 2 && (
                          <button className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                            <Send className="w-4 h-4" />
                            推送导航系统
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
