import { create } from 'zustand';
import { alertsAPI } from '@/services/api';
import type {
  AlertData,
  AlertReviewRequest,
  PaginatedResponse,
  MonitoringMetric
} from '../../../shared/types/api';

interface AlertFilterParams {
  taskId?: string;
  alertType?: string;
  severity?: string;
  isResolved?: boolean;
  dateRange?: [string, string];
}

interface AlertState {
  alerts: AlertData[];
  currentAlert: AlertData | null;
  unreadCount: number;
  monitoringMetrics: MonitoringMetric[];
  adjustmentLogs: Array<{
    id: string;
    taskId: string;
    alertId: string;
    adjustmentType: string;
    oldParams?: any;
    newParams?: any;
    oldAlgorithm?: string;
    newAlgorithm?: string;
    operator: string;
    reason: string;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
  isMonitoring: boolean;
  fetchAlerts: (filters?: AlertFilterParams, page?: number, pageSize?: number) => Promise<void>;
  fetchAlert: (alertId: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  reviewAlert: (data: AlertReviewRequest) => Promise<void>;
  processAlert: (alertId: string, autoProcess?: boolean) => Promise<void>;
  startMonitoring: (taskId: string) => Promise<void>;
  stopMonitoring: (taskId: string) => Promise<void>;
  fetchMonitoringMetrics: (taskId: string) => Promise<void>;
  updateMonitoringMetrics: (metrics: Partial<MonitoringMetric>) => Promise<void>;
  fetchAdjustmentLogs: (params?: { taskId?: string; alertId?: string }) => Promise<void>;
  clearCurrentAlert: () => void;
  clearError: () => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  currentAlert: null,
  unreadCount: 0,
  monitoringMetrics: [],
  adjustmentLogs: [],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  },
  isLoading: false,
  error: null,
  isMonitoring: false,

  fetchAlerts: async (filters, page = 1, pageSize = 20) => {
    set({ isLoading: true, error: null });
    try {
      const params = {
        ...filters,
        page,
        pageSize
      };
      const response = await alertsAPI.getAlerts(params);
      const data = response.data as PaginatedResponse<AlertData>;
      set({
        alerts: data.data,
        pagination: {
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          totalPages: data.totalPages
        },
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取预警列表失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchAlert: async (alertId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await alertsAPI.getAlert(alertId);
      set({
        currentAlert: response.data as AlertData,
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取预警详情失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await alertsAPI.getUnreadCount();
      set({ unreadCount: response.data.count || 0 });
    } catch {}
  },

  reviewAlert: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await alertsAPI.reviewAlert(data);
      set({ isLoading: false });
      if (get().currentAlert?.id === data.alertId) {
        await get().fetchAlert(data.alertId);
      }
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '预警复核失败',
        isLoading: false
      });
      throw err;
    }
  },

  processAlert: async (alertId, autoProcess = false) => {
    set({ isLoading: true, error: null });
    try {
      await alertsAPI.processAlert(alertId, { autoProcess });
      set({ isLoading: false });
      if (get().currentAlert?.id === alertId) {
        await get().fetchAlert(alertId);
      }
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '处理预警失败',
        isLoading: false
      });
      throw err;
    }
  },

  startMonitoring: async (taskId) => {
    set({ isMonitoring: true, error: null });
    try {
      await alertsAPI.startMonitoring(taskId);
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '启动监控失败',
        isMonitoring: false
      });
      throw err;
    }
  },

  stopMonitoring: async (taskId) => {
    set({ isMonitoring: false });
    try {
      await alertsAPI.stopMonitoring(taskId);
    } catch {}
  },

  fetchMonitoringMetrics: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await alertsAPI.getMonitoringMetrics(taskId);
      set({
        monitoringMetrics: response.data as MonitoringMetric[],
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取监控指标失败',
        isLoading: false
      });
      throw err;
    }
  },

  updateMonitoringMetrics: async (metrics) => {
    try {
      const response = await alertsAPI.updateMonitoringMetrics(metrics);
      return response.data;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '更新监控指标失败'
      });
      throw err;
    }
  },

  fetchAdjustmentLogs: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await alertsAPI.getAdjustmentLogs(params);
      set({
        adjustmentLogs: response.data || [],
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取调整日志失败',
        isLoading: false
      });
      throw err;
    }
  },

  clearCurrentAlert: () => {
    set({ currentAlert: null });
  },

  clearError: () => set({ error: null })
}));
