import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  ChevronRight,
  Brain,
  AlertTriangle,
  Pause,
  Play,
  Loader2,
  RefreshCw,
  FileText,
  User,
  Activity,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { usePatientStore, useUIStore, useAuthStore, useTaskStore } from '@/store';
import { RoleCode } from 'shared/types/enums';
import type { PatientSummary } from 'shared/types/api';

const mockPatients: PatientSummary[] = [
  { id: 'p1', medicalRecordNo: 'MR001', name: '张某某', gender: '男', age: 45, diagnosis: '重度抑郁症', isSuspended: false },
  { id: 'p2', medicalRecordNo: 'MR002', name: '王某某', gender: '女', age: 38, diagnosis: '强迫症', isSuspended: false },
  { id: 'p3', medicalRecordNo: 'MR003', name: '李某某', gender: '男', age: 52, diagnosis: '精神分裂症', isSuspended: false },
  { id: 'p4', medicalRecordNo: 'MR004', name: '赵某某', gender: '女', age: 29, diagnosis: '焦虑障碍', isSuspended: true },
  { id: 'p5', medicalRecordNo: 'MR005', name: '陈某某', gender: '男', age: 61, diagnosis: '帕金森病', isSuspended: false },
  { id: 'p6', medicalRecordNo: 'MR006', name: '刘某某', gender: '女', age: 47, diagnosis: '双相情感障碍', isSuspended: false },
  { id: 'p7', medicalRecordNo: 'MR007', name: '周某某', gender: '男', age: 35, diagnosis: '创伤后应激障碍', isSuspended: true },
  { id: 'p8', medicalRecordNo: 'MR008', name: '吴某某', gender: '女', age: 54, diagnosis: '重度抑郁症', isSuspended: false }
];

const deviationStats: Record<string, { count: number; maxDeviation: number; lastTasks: string[] }> = {
  p4: { count: 3, maxDeviation: 9.2, lastTasks: ['TSK-2024008', 'TSK-2024010', 'TSK-2024012'] },
  p7: { count: 3, maxDeviation: 8.7, lastTasks: ['TSK-2024009', 'TSK-2024011', 'TSK-2024013'] }
};

export default function PatientsList() {
  const navigate = useNavigate();
  const fetchPatients = usePatientStore((s) => s.fetchPatients);
  const patients = usePatientStore((s) => s.patients);
  const isLoading = usePatientStore((s) => s.isLoading);
  const suspendPatient = usePatientStore((s) => s.suspendPatient);
  const unsuspendPatient = usePatientStore((s) => s.unsuspendPatient);
  const openModal = useUIStore((s) => s.openModal);
  const hasRole = useAuthStore((s) => s.hasRole);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const canCreatePatient = hasRole([RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.DIRECTOR]);
  const canSuspendPatient = hasRole([RoleCode.CHIEF_SCIENTIST, RoleCode.ADMIN]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const displayPatients = patients.length > 0 ? patients : mockPatients;

  const filteredPatients = displayPatients.filter((p) => {
    const matchSearch =
      !searchText ||
      p.name.includes(searchText) ||
      p.medicalRecordNo.toLowerCase().includes(searchText.toLowerCase()) ||
      p.diagnosis.includes(searchText);
    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? !p.isSuspended
        : p.isSuspended;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: displayPatients.length,
    active: displayPatients.filter((p) => !p.isSuspended).length,
    suspended: displayPatients.filter((p) => p.isSuspended).length,
    highRisk: Object.keys(deviationStats).length
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">患者管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理患者信息、监测定位偏差、处理暂停状态</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPatients()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          {canCreatePatient && (
            <button
              onClick={() => openModal('create-patient')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增患者
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总患者数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">在治患者</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已暂停</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.suspended}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Pause className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">偏差高风险</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.highRisk}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
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
              placeholder="搜索患者姓名、病历号、诊断..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[140px]"
            >
              <Filter className="w-4 h-4" />
              {statusFilter === 'all' ? '全部状态' : statusFilter === 'active' ? '在治患者' : '已暂停'}
              <ChevronDown className="w-4 h-4 ml-auto" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                {[
                  { value: 'all', label: '全部状态' },
                  { value: 'active', label: '在治患者' },
                  { value: 'suspended', label: '已暂停' }
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  患者信息
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  诊断
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  连续定位偏差
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">加载中...</p>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <User className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">暂无患者数据</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const dev = deviationStats[patient.id];
                  const isHighRisk = dev && dev.count >= 3 && dev.maxDeviation > 8;
                  return (
                    <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{patient.name}</div>
                            <div className="text-xs text-gray-500">
                              {patient.medicalRecordNo} · {patient.gender} · {patient.age}岁
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{patient.diagnosis}</span>
                      </td>
                      <td className="px-6 py-4">
                        {patient.isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <Pause className="w-3 h-3" />
                            已暂停
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <Activity className="w-3 h-3" />
                            在治中
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {dev ? (
                          <div>
                            <div className="flex items-center gap-2">
                              {isHighRisk ? (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              ) : (
                                <Activity className="w-4 h-4 text-gray-400" />
                              )}
                              <span className={`text-sm font-medium ${isHighRisk ? 'text-red-600' : 'text-gray-700'}`}>
                                {dev.count}次连续定位
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              最大偏差 {dev.maxDeviation.toFixed(1)}mm
                              {isHighRisk && (
                                <span className="ml-1 text-red-600">({'>'}8mm阈值)</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">暂无异常</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/tasks?patientId=${patient.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            查看任务
                          </button>
                          {canSuspendPatient && (
                            patient.isSuspended ? (
                              <button
                                onClick={() => unsuspendPatient(patient.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Play className="w-4 h-4" />
                                恢复
                              </button>
                            ) : (
                              <button
                                onClick={() => suspendPatient(patient.id, '连续定位偏差过大')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <Pause className="w-4 h-4" />
                                暂停
                              </button>
                            )
                          )}
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
