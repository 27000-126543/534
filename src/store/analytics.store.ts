import { create } from 'zustand';
import { analyticsAPI } from '@/services/api';
import type {
  AnalyticsDashboardData,
  AnalyticsSummary,
  AnalyticsTrends,
  RadarData,
  TaskDistribution,
  RegionPerformance,
  AlgorithmPerformance
} from '../../../shared/types/api';

interface AnalyticsState {
  dashboard: AnalyticsDashboardData | null;
  summary: AnalyticsSummary | null;
  trends: AnalyticsTrends | null;
  radar: RadarData | null;
  taskDistribution: TaskDistribution | null;
  regionPerformance: RegionPerformance | null;
  algorithmPerformance: AlgorithmPerformance | null;
  dailyStats: Array<{
    date: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    avgAccuracy: number;
    avgCoverage: number;
    alertCount: number;
  }>;
  isLoading: boolean;
  error: string | null;
  fetchDashboard: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
  fetchPerformanceTrend: (params?: { days?: number }) => Promise<void>;
  fetchClinicalEffectiveness: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
  fetchStatistics: (params?: any) => Promise<void>;
  clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  dashboard: null,
  summary: null,
  trends: null,
  radar: null,
  taskDistribution: null,
  regionPerformance: null,
  algorithmPerformance: null,
  dailyStats: [],
  isLoading: false,
  error: null,

  fetchDashboard: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await analyticsAPI.getDashboard(params);
      const data = response.data as AnalyticsDashboardData;
      set({
        dashboard: data,
        summary: data.summary,
        trends: data.trends,
        radar: data.radar,
        taskDistribution: data.taskDistribution,
        regionPerformance: data.regionPerformance,
        algorithmPerformance: data.algorithmPerformance,
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取看板数据失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchPerformanceTrend: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await analyticsAPI.getPerformanceTrend(params);
      set({
        trends: response.data as AnalyticsTrends,
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取性能趋势失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchClinicalEffectiveness: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await analyticsAPI.getClinicalEffectiveness(params);
      set({
        radar: response.data as RadarData,
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取临床有效性数据失败',
        isLoading: false
      });
      throw err;
    }
  },

  fetchStatistics: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await analyticsAPI.getStatistics(params);
      set({
        dailyStats: response.data?.dailyStats || [],
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '获取统计数据失败',
        isLoading: false
      });
      throw err;
    }
  },

  clearError: () => set({ error: null })
}));
