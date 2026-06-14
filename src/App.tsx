import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import TasksList from '@/pages/TasksList';
import TaskDetail from '@/pages/TaskDetail';
import PatientsList from '@/pages/PatientsList';
import AlertsPage from '@/pages/AlertsPage';
import ApprovalsPage from '@/pages/ApprovalsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SettingsPage from '@/pages/SettingsPage';
import { useAuthStore } from '@/store';
import { useEffect } from 'react';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated && !location.pathname.startsWith('/login')) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="tasks" element={<TasksList />} />
          <Route path="tasks/:taskId" element={<TaskDetail />} />
          <Route path="patients" element={<PatientsList />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="model-library" element={
            <div className="p-6">
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🧠</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">模型库</h2>
                <p className="text-sm text-gray-500 mt-2">标准化头模型、电极模板、线圈模型管理</p>
                <p className="text-xs text-gray-400 mt-4">该模块正在开发中...</p>
              </div>
            </div>
          } />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
