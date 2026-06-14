import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Users,
  AlertTriangle,
  FileCheck,
  BarChart3,
  Settings,
  Brain,
  ChevronLeft,
  ChevronRight,
  Bell
} from 'lucide-react';
import { useAuthStore, useUIStore, useAlertStore } from '@/store';
import { RoleCode } from 'shared/types/enums';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  {
    path: '/dashboard',
    label: '综合看板',
    icon: LayoutDashboard,
    roles: [
      RoleCode.ADMIN,
      RoleCode.ENGINEER,
      RoleCode.DIRECTOR,
      RoleCode.EXPERT,
      RoleCode.CHIEF_SCIENTIST,
      RoleCode.TECHNICIAN
    ]
  },
  {
    path: '/tasks',
    label: '定位任务',
    icon: ListTodo,
    badgeKey: 'tasks',
    roles: [
      RoleCode.ADMIN,
      RoleCode.ENGINEER,
      RoleCode.DIRECTOR,
      RoleCode.EXPERT,
      RoleCode.CHIEF_SCIENTIST,
      RoleCode.TECHNICIAN
    ]
  },
  {
    path: '/patients',
    label: '患者管理',
    icon: Users,
    roles: [
      RoleCode.ADMIN,
      RoleCode.ENGINEER,
      RoleCode.DIRECTOR,
      RoleCode.EXPERT,
      RoleCode.CHIEF_SCIENTIST
    ]
  },
  {
    path: '/alerts',
    label: '预警中心',
    icon: AlertTriangle,
    badgeKey: 'alerts',
    roles: [
      RoleCode.ADMIN,
      RoleCode.EXPERT,
      RoleCode.CHIEF_SCIENTIST
    ]
  },
  {
    path: '/approvals',
    label: '审批中心',
    icon: FileCheck,
    badgeKey: 'approvals',
    roles: [
      RoleCode.ENGINEER,
      RoleCode.DIRECTOR,
      RoleCode.CHIEF_SCIENTIST
    ]
  },
  {
    path: '/analytics',
    label: '数据分析',
    icon: BarChart3,
    roles: [
      RoleCode.ADMIN,
      RoleCode.CHIEF_SCIENTIST,
      RoleCode.DIRECTOR
    ]
  },
  {
    path: '/model-library',
    label: '模型库',
    icon: Brain,
    roles: [
      RoleCode.ADMIN,
      RoleCode.ENGINEER,
      RoleCode.EXPERT,
      RoleCode.CHIEF_SCIENTIST
    ]
  },
  {
    path: '/settings',
    label: '系统设置',
    icon: Settings,
    roles: [RoleCode.ADMIN]
  }
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const unreadCount = useAlertStore((s) => s.unreadCount);

  const hasRole = (roles: RoleCode[]) => {
    if (!user) return false;
    return roles.includes(user.roleCode);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 z-40 flex flex-col ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className={`flex items-center h-16 border-b border-slate-800 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">NeuroSource</div>
              <div className="text-[10px] text-slate-400">脑源定位平台</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${collapsed ? 'hidden' : 'block'}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={onToggle}
          className="p-2 m-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex justify-center"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems
            .filter((item) => hasRole(item.roles))
            .map((item) => {
              const Icon = item.icon;
              const showBadge = item.badgeKey === 'alerts' && unreadCount > 0;

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      } ${collapsed ? 'justify-center px-0' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {showBadge && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      <>
                        <span className="text-sm font-medium">{item.label}</span>
                        {showBadge && (
                          <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {user?.fullName || '未登录'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {user?.roleName || '访客'}
              </div>
            </div>
            <Bell className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </div>
        </div>
      )}
    </aside>
  );
}
