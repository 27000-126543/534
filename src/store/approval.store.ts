import { create } from 'zustand';
import { approvalsAPI } from '@/services/api';
import { ApprovalStatus } from '../../../shared/types/enums';
import type {
  ApprovalRecord,
  ApprovalActionRequest,
  PaginatedResponse
} from '../../../shared/types/api';

interface ApprovalFilterParams {
  taskId?: string;
  approvalLevel?: 1 | 2;
  status?: ApprovalStatus;
  approverId?: string;
  dateRange?: [string, string];
}

interface ApprovalState {
  approvals: ApprovalRecord[];
  currentApproval: ApprovalRecord | null;
  approvalHistory: ApprovalRecord[];
  permissions: Record<string, boolean>;
  navigationStatus: {
    pushed: boolean;
    pushedAt?: string;
    navigationTaskId?: string;
    error?: string;
  } | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
  fetchApprovals: (filters?: ApprovalFilterParams, page?: number, pageSize?: number) => Promise<void>;
  fetchApproval: (approvalId: string) => Promise<void>;
  fetchApprovalHistory: (taskId: string) => Promise<void>;
  submitApproval: (taskId: string, type: string, comments?: string) => Promise<void>;
  processApproval: (data: ApprovalActionRequest) => Promise<void>;
  resubmitApproval: (approvalId: string, comments?: string) => Promise<void>;
  fetchPermissions: (roleCode: string) => Promise<void>;
  pushToNavigation: (taskId: string) => Promise<void>;
  fetchNavigationStatus: (taskId: string) => Promise<void>;
  checkPermission: (resource: string, action: string) => Promise<boolean>;
  clearCurrentApproval: () => void;
  clearError: () => void;
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  approvals: [],
  currentApproval: null,
  approvalHistory: [],
  permissions: {},
  navigationStatus: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  },
  isLoading: false,
  error: null,

  fetchApprovals: async (filters, page = 1, pageSize = 20) => {
    set({ isLoading: true, error: null });
    try {
      const params = {
        ...filters,
        page,
        pageSize
      };
      const response = await approvalsAPI.getApprovals(params);
      const data = response.data as PaginatedResponse<ApprovalRecord>;
      set({
        approvals: data.data,
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
        error: err.response?.data?.message || '获取审批列表失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchApproval: async (approvalId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await approvalsAPI.getApproval(approvalId);
      set({
        currentApproval: response.data as ApprovalRecord,
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取审批详情失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchApprovalHistory: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await approvalsAPI.getHistory(taskId);
      set({
        approvalHistory: response.data as ApprovalRecord[],
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取审批历史失败',
        isLoading: false
      });
      throw err;
    }
  },

  submitApproval: async (taskId, type, comments) => {
    set({ isLoading: true, error: null });
    try {
      await approvalsAPI.submitApproval({ taskId, type, comments });
      set({ isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '提交审批失败',
        isLoading: false
      });
      throw err;
    }
  },

  processApproval: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await approvalsAPI.processApproval(data.approvalId, {
        approved: data.approved,
        comment: data.comment
      });
      set({ isLoading: false });
      if (get().currentApproval?.id === data.approvalId) {
        await get().fetchApproval(data.approvalId);
      }
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '处理审批失败',
        isLoading: false
      });
      throw err;
    }
  },

  resubmitApproval: async (approvalId, comments) => {
    set({ isLoading: true, error: null });
    try {
      await approvalsAPI.resubmitApproval(approvalId, { comments });
      set({ isLoading: false });
      if (get().currentApproval?.id === approvalId) {
        await get().fetchApproval(approvalId);
      }
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '重新提交审批失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchPermissions: async (roleCode) => {
    try {
      const response = await approvalsAPI.getPermissions(roleCode);
      set({ permissions: response.data || {} });
    } catch {}
  },

  pushToNavigation: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      await approvalsAPI.pushToNavigation(taskId);
      set({ isLoading: false });
      await get().fetchNavigationStatus(taskId);
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '推送导航系统失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchNavigationStatus: async (taskId) => {
    try {
      const response = await approvalsAPI.getNavigationStatus(taskId);
      set({ navigationStatus: response.data });
    } catch {}
  },

  checkPermission: async (resource, action) => {
    try {
      const response = await approvalsAPI.checkPermission(resource, action);
      return response.data?.allowed || false;
    } catch {
      return false;
    }
  },

  clearCurrentApproval: () => {
    set({ currentApproval: null });
  },

  clearError: () => set({ error: null })
}));
