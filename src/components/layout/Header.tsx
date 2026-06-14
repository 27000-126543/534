import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Sun,
  Moon,
  HelpCircle
} from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activeTheme = useUIStore((s) => s.activeTheme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const breadcrumbs = useUIStore((s) => s.breadcrumbs);
  const currentPageTitle = useUIStore((s) => s.currentPageTitle);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mockNotifications = [
    {
      id: '1',
      type: 'error',
      title: '拟合残差超限',
      description: '任务 TSK-2024015 残差达 12.3%，已超过阈值 10%',
      time: '5 分钟前',
      read: false
    },
    {
      id: '2',
      type: 'warning',
      title: '源中心偏移预警',
      description: '任务 TSK-2024012 连续偏移 5.8mm',
      time: '32 分钟前',
      read: false
    },
    {
      id: '3',
      type: 'info',
      title: '审批待处理',
      description: '临床工程师审批队列新增 2 条记录',
      time: '1 小时前',
      read: true
    },
    {
      id: '4',
      type: 'success',
      title: '任务完成',
      description: '任务 TSK-2024010 已完成全部流程',
      time: '2 小时前',
      read: true
    }
  ];

  const unreadNotifCount = mockNotifications.filter((n) => !n.read).length;

  const notifIcons = {
    error: 'bg-red-500/20 text-red-400',
    warning: 'bg-orange-500/20 text-orange-400',
    info: 'bg-blue-500/20 text-blue-400',
    success: 'bg-green-500/20 text-green-400'
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-30">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">{currentPageTitle}</h1>
            {breadcrumbs.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                {breadcrumbs.map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span>/</span>}
                    <span className={i === breadcrumbs.length - 1 ? 'text-slate-300' : ''}>
                      {b.label}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索任务、患者..."
              className="w-64 h-9 pl-9 pr-4 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={activeTheme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
          >
            {activeTheme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          <button
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="帮助文档"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">通知</h3>
                  <button className="text-xs text-blue-400 hover:text-blue-300">
                    全部标记已读
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {mockNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer transition-colors ${
                        !notif.read ? 'bg-slate-700/20' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notifIcons[notif.type as keyof typeof notifIcons]}`}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-white truncate">
                              {notif.title}
                            </span>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                            {notif.description}
                          </p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {notif.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-slate-700">
                  <button className="w-full text-center text-sm text-blue-400 hover:text-blue-300 font-medium">
                    查看全部通知
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-slate-700" />

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-white leading-tight">
                  {user?.fullName || '访客'}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {user?.title || '未登录'}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700">
                  <div className="text-sm font-semibold text-white">{user?.fullName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{user?.email || user?.roleName}</div>
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-medium">
                    {user?.roleName}
                  </div>
                </div>
                <div className="py-1">
                  <button className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                    <User className="w-4 h-4" />
                    个人资料
                  </button>
                  <button className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                    <Settings className="w-4 h-4" />
                    账户设置
                  </button>
                </div>
                <div className="border-t border-slate-700 py-1">
                  <button
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
