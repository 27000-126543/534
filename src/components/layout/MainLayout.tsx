import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore, useAlertStore, useAuthStore } from '@/store';

const pageTitles: Record<string, { title: string; breadcrumbs: Array<{ label: string; path?: string }> }> = {
  '/dashboard': {
    title: '综合看板',
    breadcrumbs: [{ label: '首页' }, { label: '综合看板' }]
  },
  '/tasks': {
    title: '定位任务',
    breadcrumbs: [{ label: '首页' }, { label: '定位任务' }]
  },
  '/patients': {
    title: '患者管理',
    breadcrumbs: [{ label: '首页' }, { label: '患者管理' }]
  },
  '/alerts': {
    title: '预警中心',
    breadcrumbs: [{ label: '首页' }, { label: '预警中心' }]
  },
  '/approvals': {
    title: '审批中心',
    breadcrumbs: [{ label: '首页' }, { label: '审批中心' }]
  },
  '/analytics': {
    title: '数据分析',
    breadcrumbs: [{ label: '首页' }, { label: '数据分析' }]
  },
  '/model-library': {
    title: '模型库',
    breadcrumbs: [{ label: '首页' }, { label: '模型库' }]
  },
  '/settings': {
    title: '系统设置',
    breadcrumbs: [{ label: '首页' }, { label: '系统设置' }]
  }
};

export function MainLayout() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setCurrentPageTitle = useUIStore((s) => s.setCurrentPageTitle);
  const setBreadcrumbs = useUIStore((s) => s.setBreadcrumbs);
  const fetchUnreadCount = useAlertStore((s) => s.fetchUnreadCount);
  const getCurrentUser = useAuthStore((s) => s.getCurrentUser);
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let matched = pageTitles[path];
    if (!matched) {
      if (path.startsWith('/tasks/')) {
        matched = {
          title: '任务详情',
          breadcrumbs: [
            { label: '首页' },
            { label: '定位任务', path: '/tasks' },
            { label: '任务详情' }
          ]
        };
      } else if (path.startsWith('/patients/')) {
        matched = {
          title: '患者详情',
          breadcrumbs: [
            { label: '首页' },
            { label: '患者管理', path: '/patients' },
            { label: '患者详情' }
          ]
        };
      } else {
        matched = {
          title: '综合看板',
          breadcrumbs: [{ label: '首页' }, { label: '综合看板' }]
        };
      }
    }
    setCurrentPageTitle(matched.title);
    setBreadcrumbs(matched.breadcrumbs);
  }, [location.pathname, setCurrentPageTitle, setBreadcrumbs]);

  useEffect(() => {
    fetchUnreadCount();
    getCurrentUser();
  }, [fetchUnreadCount, getCurrentUser]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div
        className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}
      >
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
