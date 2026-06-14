import { create } from 'zustand';
import { patientsAPI, workflowAPI } from '@/services/api';
import type {
  PatientSummary,
  PaginatedResponse,
  PaginationParams,
  TaskSummary
} from 'shared/types/api';

interface PatientFilterParams {
  search?: string;
  isSuspended?: boolean;
  diagnosis?: string;
  dateRange?: [string, string];
}

interface PatientState {
  patients: PatientSummary[];
  currentPatient: PatientSummary | null;
  patientTasks: TaskSummary[];
  deviationData: {
    consecutiveCount: number;
    maxDeviation: number;
    sourceCenters: Array<{ taskId: string; center: [number, number, number] }>;
  } | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
  fetchPatients: (filters?: PatientFilterParams, pagination?: PaginationParams) => Promise<void>;
  fetchPatient: (patientId: string) => Promise<void>;
  fetchPatientTasks: (patientId: string) => Promise<void>;
  fetchPatientDeviation: (patientId: string) => Promise<void>;
  createPatient: (data: Partial<PatientSummary>) => Promise<string>;
  updatePatient: (patientId: string, data: Partial<PatientSummary>) => Promise<void>;
  suspendPatient: (patientId: string, reason: string, triggeredByTaskId: string, deviationMm: number) => Promise<void>;
  unsuspendPatient: (patientId: string) => Promise<void>;
  checkDeviation: (patientId: string) => Promise<{ isExceeded: boolean; deviation: number }>;
  clearCurrentPatient: () => void;
  clearError: () => void;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  currentPatient: null,
  patientTasks: [],
  deviationData: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  },
  isLoading: false,
  error: null,

  fetchPatients: async (filters, pagination) => {
    set({ isLoading: true, error: null });
    try {
      const params = {
        ...filters,
        page: pagination?.page || 1,
        pageSize: pagination?.pageSize || 20,
        sortBy: pagination?.sortBy || 'createdAt',
        sortOrder: pagination?.sortOrder || 'desc'
      };
      const response = await patientsAPI.getPatients(params);
      const data = response.data as PaginatedResponse<PatientSummary>;
      set({
        patients: data.data,
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
        error: err.response?.data?.message || '获取患者列表失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchPatient: async (patientId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await patientsAPI.getPatient(patientId);
      set({
        currentPatient: response.data as PatientSummary,
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取患者信息失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchPatientTasks: async (patientId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await patientsAPI.getPatientTasks(patientId);
      set({
        patientTasks: response.data as TaskSummary[],
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取患者任务失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchPatientDeviation: async (patientId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await patientsAPI.getPatientDeviation(patientId);
      set({
        deviationData: response.data,
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取偏差数据失败',
        isLoading: false
      });
      throw err;
    }
  },

  createPatient: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await patientsAPI.createPatient(data);
      set({ isLoading: false });
      return response.data.id;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '创建患者失败',
        isLoading: false
      });
      throw err;
    }
  },

  updatePatient: async (patientId, data) => {
    set({ isLoading: true, error: null });
    try {
      await patientsAPI.updatePatient(patientId, data);
      set({ isLoading: false });
      await get().fetchPatient(patientId);
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '更新患者信息失败',
        isLoading: false
      });
      throw err;
    }
  },

  suspendPatient: async (patientId, reason, triggeredByTaskId, deviationMm) => {
    set({ isLoading: true, error: null });
    try {
      await workflowAPI.suspendPatient(patientId, {
        reason,
        triggeredByTaskId,
        deviationMm
      });
      set({ isLoading: false });
      await get().fetchPatient(patientId);
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '暂停患者失败',
        isLoading: false
      });
      throw err;
    }
  },

  unsuspendPatient: async (patientId) => {
    set({ isLoading: true, error: null });
    try {
      await patientsAPI.updatePatient(patientId, { isSuspended: false });
      set({ isLoading: false });
      await get().fetchPatient(patientId);
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '恢复患者失败',
        isLoading: false
      });
      throw err;
    }
  },

  checkDeviation: async (patientId) => {
    try {
      const response = await workflowAPI.checkPatientDeviation(patientId);
      return response.data;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '检查偏差失败'
      });
      throw err;
    }
  },

  clearCurrentPatient: () => {
    set({
      currentPatient: null,
      patientTasks: [],
      deviationData: null
    });
  },

  clearError: () => set({ error: null })
}));
