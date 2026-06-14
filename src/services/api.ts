import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data)
};

export const workflowAPI = {
  getValidTransitions: (taskId: string) =>
    api.get(`/workflow/transitions/${taskId}`),
  transition: (taskId: string, data: { targetStatus: string; comment?: string }) =>
    api.post(`/workflow/transition/${taskId}`, data),
  autoAdvance: (taskId: string) =>
    api.post(`/workflow/auto-advance/${taskId}`),
  getHistory: (taskId: string) =>
    api.get(`/workflow/history/${taskId}`),
  getProgress: (taskId: string) =>
    api.get(`/workflow/progress/${taskId}`),
  retry: (taskId: string, data: { fromStatus: string }) =>
    api.post(`/workflow/retry/${taskId}`, data),
  checkPatientDeviation: (patientId: string) =>
    api.get(`/workflow/check-deviation/${patientId}`),
  suspendPatient: (patientId: string, data: { reason: string }) =>
    api.post(`/workflow/suspend-patient/${patientId}`, data)
};

export const computeAPI = {
  buildHeadModel: (taskId: string, data: any) =>
    api.post(`/compute/head-model/build/${taskId}`, data),
  getHeadModel: (taskId: string) =>
    api.get(`/compute/head-model/${taskId}`),
  getHeadModelQuality: (taskId: string) =>
    api.get(`/compute/head-model/quality/${taskId}`),
  getSourcePositions: (taskId: string) =>
    api.get(`/compute/head-model/sources/${taskId}`),
  
  solveForward: (taskId: string, data: any) =>
    api.post(`/compute/forward/solve/${taskId}`, data),
  getForwardResult: (taskId: string) =>
    api.get(`/compute/forward/${taskId}`),
  getLeadfield: (taskId: string) =>
    api.get(`/compute/forward/leadfield/${taskId}`),
  getForwardMetrics: (taskId: string) =>
    api.get(`/compute/forward/metrics/${taskId}`),
  
  solveSource: (taskId: string, data: any) =>
    api.post(`/compute/source/solve/${taskId}`, data),
  getSourceResult: (taskId: string) =>
    api.get(`/compute/source/${taskId}`),
  getSourceActivity: (taskId: string, timeWindow?: number) =>
    api.get(`/compute/source/activity/${taskId}`, {
      params: { timeWindow }
    }),
  getSourceMetrics: (taskId: string) =>
    api.get(`/compute/source/metrics/${taskId}`),
  
  optimizeTarget: (taskId: string, data: any) =>
    api.post(`/compute/target/optimize/${taskId}`, data),
  getTargetPlan: (taskId: string) =>
    api.get(`/compute/target/${taskId}`),
  getCoils: () =>
    api.get('/compute/target/coils'),
  getPulseSchemes: () =>
    api.get('/compute/target/pulse-schemes'),
  getRecommendation: (data: any) =>
    api.post('/compute/target/recommend', data),
  exportCoordinates: (taskId: string, format?: string) =>
    api.get(`/compute/target/export/coordinates/${taskId}`, {
      params: { format }
    }),
  exportSourceData: (taskId: string, params?: any) =>
    api.get(`/compute/target/export/source-data/${taskId}`, { params })
};

export const alertsAPI = {
  getAlerts: (params?: any) =>
    api.get('/alerts', { params }),
  getAlert: (alertId: string) =>
    api.get(`/alerts/${alertId}`),
  processAlert: (alertId: string, data?: { autoProcess?: boolean }) =>
    api.post(`/alerts/${alertId}/process`, data),
  reviewAlert: (data: any) =>
    api.post('/alerts/review', data),
  startMonitoring: (taskId: string) =>
    api.post(`/alerts/monitoring/start/${taskId}`),
  stopMonitoring: (taskId: string) =>
    api.post(`/alerts/monitoring/stop/${taskId}`),
  getMonitoringMetrics: (taskId: string) =>
    api.get(`/alerts/monitoring/metrics/${taskId}`),
  updateMonitoringMetrics: (data: any) =>
    api.post('/alerts/monitoring/metrics', data),
  getConfig: () =>
    api.get('/alerts/config'),
  updateConfig: (data: any) =>
    api.put('/alerts/config', data),
  getAdjustmentLogs: (params?: { taskId?: string; alertId?: string }) =>
    api.get('/alerts/adjustment-logs', { params }),
  getUnreadCount: () =>
    api.get('/alerts/notifications/unread-count'),
  markNotificationRead: (notificationId: string) =>
    api.post(`/alerts/notifications/${notificationId}/read`)
};

export const approvalsAPI = {
  getApprovals: (params?: any) =>
    api.get('/approvals', { params }),
  getApproval: (approvalId: string) =>
    api.get(`/approvals/${approvalId}`),
  submitApproval: (data: { taskId: string; type: string; comments?: string }) =>
    api.post('/approvals/submit', data),
  processApproval: (approvalId: string, data: any) =>
    api.post(`/approvals/${approvalId}/process`, data),
  resubmitApproval: (approvalId: string, data?: { comments?: string }) =>
    api.post(`/approvals/${approvalId}/resubmit`, data),
  getHistory: (taskId: string) =>
    api.get(`/approvals/history/${taskId}`),
  getPermissions: (roleCode: string) =>
    api.get(`/approvals/permissions/${roleCode}`),
  getFlowConfig: (type: string) =>
    api.get(`/approvals/flows/${type}`),
  pushToNavigation: (taskId: string) =>
    api.post(`/approvals/navigation/push/${taskId}`),
  getNavigationStatus: (taskId: string) =>
    api.get(`/approvals/navigation/status/${taskId}`),
  checkPermission: (resource: string, action: string) =>
    api.get('/approvals/check-permission', { params: { resource, action } })
};

export const tasksAPI = {
  getTasks: (params?: any) =>
    api.get('/tasks', { params }),
  getTask: (taskId: string) =>
    api.get(`/tasks/${taskId}`),
  createTask: (data: any) =>
    api.post('/tasks', data),
  updateTask: (taskId: string, data: any) =>
    api.put(`/tasks/${taskId}`, data),
  deleteTask: (taskId: string) =>
    api.delete(`/tasks/${taskId}`),
  uploadFiles: (taskId: string, formData: FormData) =>
    api.post(`/tasks/${taskId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
};

export const patientsAPI = {
  getPatients: (params?: any) =>
    api.get('/patients', { params }),
  getPatient: (patientId: string) =>
    api.get(`/patients/${patientId}`),
  createPatient: (data: any) =>
    api.post('/patients', data),
  updatePatient: (patientId: string, data: any) =>
    api.put(`/patients/${patientId}`, data),
  getPatientTasks: (patientId: string) =>
    api.get(`/patients/${patientId}/tasks`),
  getPatientDeviation: (patientId: string) =>
    api.get(`/patients/${patientId}/deviation`)
};

export const reportsAPI = {
  generateReport: (taskId: string) =>
    api.post(`/reports/generate/${taskId}`),
  getReport: (reportId: string) =>
    api.get(`/reports/${reportId}`),
  downloadReport: (reportId: string) =>
    api.get(`/reports/${reportId}/download`, {
      responseType: 'blob'
    }),
  getReports: (params?: any) =>
    api.get('/reports', { params })
};

export const analyticsAPI = {
  getDashboard: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics/dashboard', { params }),
  getPerformanceTrend: (params?: { days?: number }) =>
    api.get('/analytics/performance-trend', { params }),
  getClinicalEffectiveness: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics/clinical-effectiveness', { params }),
  getStatistics: (params?: any) =>
    api.get('/analytics/statistics', { params })
};

export default api;
