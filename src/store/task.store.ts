import { create } from 'zustand';
import { tasksAPI, workflowAPI, computeAPI } from '@/services/api';
import { TaskStatus } from '../../../shared/types/enums';
import type {
  TaskSummary,
  TaskDetailResponse,
  CreateTaskRequest,
  PaginatedResponse,
  TaskFilterParams,
  PaginationParams,
  HeadModelData,
  ForwardResultData,
  SourceResultData,
  TargetPlanData
} from '../../../shared/types/api';

interface TaskState {
  tasks: TaskSummary[];
  currentTask: TaskDetailResponse | null;
  headModel: HeadModelData | null;
  forwardResult: ForwardResultData | null;
  sourceResult: SourceResultData | null;
  targetPlan: TargetPlanData | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
  progress: number;
  progressMessage: string;
  fetchTasks: (filters?: TaskFilterParams, pagination?: PaginationParams) => Promise<void>;
  fetchTaskDetail: (taskId: string) => Promise<void>;
  createTask: (data: CreateTaskRequest) => Promise<string>;
  uploadFiles: (taskId: string, formData: FormData) => Promise<void>;
  buildHeadModel: (taskId: string) => Promise<void>;
  solveForward: (taskId: string) => Promise<void>;
  solveSource: (taskId: string) => Promise<void>;
  optimizeTarget: (taskId: string) => Promise<void>;
  transitionStatus: (taskId: string, targetStatus: TaskStatus, comment?: string) => Promise<void>;
  retryTask: (taskId: string, fromStatus: TaskStatus) => Promise<void>;
  setProgress: (progress: number, message?: string) => void;
  clearCurrentTask: () => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  currentTask: null,
  headModel: null,
  forwardResult: null,
  sourceResult: null,
  targetPlan: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  },
  isLoading: false,
  isDetailLoading: false,
  error: null,
  progress: 0,
  progressMessage: '',

  fetchTasks: async (filters, pagination) => {
    set({ isLoading: true, error: null });
    try {
      const params = {
        ...filters,
        page: pagination?.page || 1,
        pageSize: pagination?.pageSize || 20,
        sortBy: pagination?.sortBy || 'createdAt',
        sortOrder: pagination?.sortOrder || 'desc'
      };
      const response = await tasksAPI.getTasks(params);
      const data = response.data as PaginatedResponse<TaskSummary>;
      set({
        tasks: data.data,
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
        error: err.response?.data?.message || '获取任务列表失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchTaskDetail: async (taskId) => {
    set({ isDetailLoading: true, error: null });
    try {
      const response = await tasksAPI.getTask(taskId);
      const task = response.data as TaskDetailResponse;
      set({
        currentTask: task,
        headModel: task.headModel || null,
        forwardResult: task.forwardResult || null,
        sourceResult: task.sourceResult || null,
        targetPlan: task.targetPlan || null,
        progress: task.progress,
        isDetailLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取任务详情失败',
        isDetailLoading: false
      });
      throw err;
    }
  },

  createTask: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await tasksAPI.createTask(data);
      set({ isLoading: false });
      return response.data.id;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '创建任务失败',
        isLoading: false
      });
      throw err;
    }
  },

  uploadFiles: async (taskId, formData) => {
    set({ isLoading: true, error: null });
    try {
      await tasksAPI.uploadFiles(taskId, formData);
      set({ isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '文件上传失败',
        isLoading: false
      });
      throw err;
    }
  },

  buildHeadModel: async (taskId) => {
    set({ isLoading: true, error: null });
    get().setProgress(5, '正在构建头模型...');
    try {
      const response = await computeAPI.buildHeadModel(taskId, {});
      set({ headModel: response.data as HeadModelData, isLoading: false });
      get().setProgress(25, '头模型构建完成');
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '头模型构建失败',
        isLoading: false
      });
      throw err;
    }
  },

  solveForward: async (taskId) => {
    set({ isLoading: true, error: null });
    get().setProgress(30, '正在求解正问题...');
    try {
      const response = await computeAPI.solveForward(taskId, {});
      set({ forwardResult: response.data as ForwardResultData, isLoading: false });
      get().setProgress(50, '正问题求解完成');
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '正问题求解失败',
        isLoading: false
      });
      throw err;
    }
  },

  solveSource: async (taskId) => {
    set({ isLoading: true, error: null });
    get().setProgress(55, '正在进行源反演...');
    try {
      const response = await computeAPI.solveSource(taskId, {});
      set({ sourceResult: response.data as SourceResultData, isLoading: false });
      get().setProgress(75, '源反演完成');
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '源反演失败',
        isLoading: false
      });
      throw err;
    }
  },

  optimizeTarget: async (taskId) => {
    set({ isLoading: true, error: null });
    get().setProgress(80, '正在优化靶点...');
    try {
      const response = await computeAPI.optimizeTarget(taskId, {});
      set({ targetPlan: response.data as TargetPlanData, isLoading: false });
      get().setProgress(100, '靶点优化完成');
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '靶点优化失败',
        isLoading: false
      });
      throw err;
    }
  },

  transitionStatus: async (taskId, targetStatus, comment) => {
    set({ isLoading: true, error: null });
    try {
      await workflowAPI.transition(taskId, {
        targetStatus,
        comment
      });
      set({ isLoading: false });
      await get().fetchTaskDetail(taskId);
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '状态转换失败',
        isLoading: false
      });
      throw err;
    }
  },

  retryTask: async (taskId, fromStatus) => {
    set({ isLoading: true, error: null });
    try {
      await workflowAPI.retry(taskId, { fromStatus });
      set({ isLoading: false });
      await get().fetchTaskDetail(taskId);
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '重试失败',
        isLoading: false
      });
      throw err;
    }
  },

  setProgress: (progress, message = '') => {
    set({ progress, progressMessage: message });
  },

  clearCurrentTask: () => {
    set({
      currentTask: null,
      headModel: null,
      forwardResult: null,
      sourceResult: null,
      targetPlan: null,
      progress: 0,
      progressMessage: ''
    });
  },

  clearError: () => set({ error: null })
}));
