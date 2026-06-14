import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  Brain,
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Upload,
  FileText,
  X
} from 'lucide-react';
import { useTaskStore, useUIStore, usePatientStore, useAuthStore } from '@/store';
import { TaskStatusColor, TaskStatusText, AlgorithmTypeText, RoleCode } from '../../../shared/types/enums';
import type { TaskSummary, PatientSummary } from '../../../shared/types/api';

const statusFilters = [
  { value: 'all', label: '全部状态' },
  { value: 'pending_validation', label: '待校验' },
  { value: 'head_model_building', label: '头模型构建中' },
  { value: 'forward_computing', label: '正问题计算中' },
  { value: 'source_inverting', label: '源反演计算中' },
  { value: 'target_evaluating', label: '靶点评估中' },
  { value: 'pending_engineer_approval', label: '待工程师审批' },
  { value: 'pending_director_approval', label: '待主任审批' },
  { value: 'completed', label: '已完成' },
  { value: 'abnormal_fallback', label: '异常回退' }
];

export default function TasksList() {
  const navigate = useNavigate();
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const tasks = useTaskStore((s) => s.tasks);
  const pagination = useTaskStore((s) => s.pagination);
  const isLoading = useTaskStore((s) => s.isLoading);
  const openModal = useUIStore((s) => s.openModal);
  const fetchPatients = usePatientStore((s) => s.fetchPatients);
  const patients = usePatientStore((s) => s.patients);
  const hasRole = useAuthStore((s) => s.hasRole);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [patientFilter, setPatientFilter] = useState('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const canCreateTask = hasRole([RoleCode.ENGINEER, RoleCode.ADMIN]);

  useEffect(() => {
    fetchTasks();
    fetchPatients();
  }, [fetchTasks, fetchPatients]);

  const filteredTasks: TaskSummary[] = tasks.filter((task) => {
    const matchSearch =
      !searchText ||
      task.taskNo.toLowerCase().includes(searchText.toLowerCase()) ||
      task.patient.name.includes(searchText) ||
      task.patient.medicalRecordNo.includes(searchText);
    const matchStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchPatient = patientFilter === 'all' || task.patient.id === patientFilter;
    return matchSearch && matchStatus && matchPatient;
  });

  const StatusBadge = ({ status }: { status: string }) => (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: (TaskStatusColor as any)[status] + '20',
        color: (TaskStatusColor as any)[status]
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: (TaskStatusColor as any)[status] }}
      />
      {(TaskStatusText as any)[status]}
    </span>
  );

  const ProgressBar = ({ progress, status }: { progress: number; status: string }) => {
    const isError = status.includes('failed') || status === 'abnormal_fallback';
    return (
      <div className="w-32">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>进度</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: isError ? '#EF5350' : progress === 100 ? '#26A69A' : '#42A5F5'
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">定位任务</h1>
          <p className="text-sm text-gray-500 mt-1">管理所有脑电源定位与TMS靶点优化任务</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTasks()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          {canCreateTask && (
            <>
              <button
                onClick={() => openModal('upload-files')}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                上传文件
              </button>
              <button
                onClick={() => openModal('create-task')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新建任务
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索任务编号、患者姓名、病历号..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowPatientDropdown(false);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[140px]"
            >
              <Filter className="w-4 h-4" />
              {statusFilters.find((f) => f.value === statusFilter)?.label || '状态筛选'}
              <ChevronDown className="w-4 h-4 ml-auto" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                {statusFilters.map((f) => (
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

          <div className="relative">
            <button
              onClick={() => {
                setShowPatientDropdown(!showPatientDropdown);
                setShowStatusDropdown(false);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[160px]"
            >
              <Brain className="w-4 h-4" />
              {patientFilter === 'all'
                ? '全部患者'
                : patients.find((p) => p.id === patientFilter)?.name || '选择患者'}
              <ChevronDown className="w-4 h-4 ml-auto" />
            </button>
            {showPatientDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setPatientFilter('all');
                    setShowPatientDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    patientFilter === 'all' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                  }`}
                >
                  全部患者
                </button>
                {(patients.length > 0
                  ? patients
                  : [
                      { id: 'p1', name: '张某某', medicalRecordNo: 'MR001' },
                      { id: 'p2', name: '王某某', medicalRecordNo: 'MR002' },
                      { id: 'p3', name: '李某某', medicalRecordNo: 'MR003' }
                    ] as PatientSummary[]
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPatientFilter(p.id);
                      setShowPatientDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      patientFilter === p.id ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.medicalRecordNo}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  任务信息
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  患者信息
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  算法
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  进度
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">加载中...</p>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">暂无任务数据</p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{task.taskNo}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        创建人：{task.createdBy.fullName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                          {task.patient.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{task.patient.name}</div>
                          <div className="text-xs text-gray-500">
                            {task.patient.gender} · {task.patient.age}岁 · {task.patient.diagnosis}
                          </div>
                        </div>
                        {task.patient.isSuspended && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            已暂停
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm text-gray-700">
                          {(AlgorithmTypeText as any)[task.algorithmType]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-6 py-4">
                      <ProgressBar progress={task.progress} status={task.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {new Date(task.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        查看详情
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            显示 {filteredTasks.length} / {pagination.total || filteredTasks.length} 条
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={pagination.page <= 1}
            >
              上一页
            </button>
            <span className="text-sm text-gray-600 px-2">
              第 {pagination.page || 1} 页 / 共 {pagination.totalPages || 1} 页
            </span>
            <button
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={pagination.page >= pagination.totalPages}
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
