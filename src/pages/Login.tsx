import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Brain,
  User,
  Lock,
  Shield,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';
import { RoleCode } from 'shared/types/enums';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const showNotification = useUIStore((s) => s.showNotification);
  const user = useAuthStore((s) => s.user);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('engineer');
  const [localError, setLocalError] = useState<string | null>(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const demoAccounts = [
    { role: RoleCode.ADMIN, username: 'admin', name: '赵管理员', desc: '系统管理员：全部功能权限' },
    { role: RoleCode.ENGINEER, username: 'eng1', name: '李工程师', desc: '临床工程师：任务创建与一级审批' },
    { role: RoleCode.DIRECTOR, username: 'dir1', name: '钱主任', desc: '神经内科主任：终审确认' },
    { role: RoleCode.EXPERT, username: 'exp1', name: '王专家', desc: '神经电生理专家：预警复核' },
    { role: RoleCode.CHIEF_SCIENTIST, username: 'chief1', name: '孙首席', desc: '首席科学家：患者异常处理' },
    { role: RoleCode.TECHNICIAN, username: 'tech1', name: '周技术员', desc: '实验室技术员：导航系统操作' }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (!username.trim() || !password.trim()) {
      setLocalError('请输入用户名和密码');
      return;
    }
    try {
      await login(username.trim(), password.trim());
      showNotification(`登录成功，欢迎回来！`, 'success');
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '登录失败，请检查账号密码';
      setLocalError(msg);
    }
  };

  const handleQuickLogin = (role: string, uname: string) => {
    setSelectedRole(role);
    setUsername(uname);
    setPassword('demo123456');
    setLocalError(null);
    clearError();
  };

  const handleLogoutDemo = async () => {
    await logout();
    showNotification('已退出登录', 'success');
  };

  const errorMsg = localError || authError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-2 gap-0 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-10 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Brain className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold">NeuroGuide</h2>
                <p className="text-xs text-white/70">脑神经调控精准定位平台</p>
              </div>
            </div>
            <h1 className="text-3xl font-bold leading-tight mb-4">
              高精度脑电源定位<br />与TMS靶点优化系统
            </h1>
            <p className="text-white/80 text-sm leading-relaxed">
              整合个体化头颅MRI分割、分布式源成像算法与智能推荐引擎，
              为临床神经调控提供从源定位到靶点方案的全流程精准解决方案。
            </p>
          </div>

          <div className="relative space-y-4">
            {[
              { icon: Brain, title: '三层真实头模型', desc: '头皮-颅骨-脑皮层BEM/FEM正问题求解' },
              { icon: Shield, title: '5种源成像算法', desc: 'sLORETA / Beamforming / MNLS / LORETA / DICS' },
              { icon: AlertCircle, title: '多级预警与两级审批', desc: '实时残差监控、专家复核、工程师+主任双审' }
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{f.title}</div>
                  <div className="text-xs text-white/60 mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative text-xs text-white/50">
            © 2024 NeuroGuide Platform · Clinical Research Edition
          </div>
        </div>

        <div className="p-10 flex flex-col">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">欢迎登录</h2>
            <p className="text-sm text-gray-500 mt-1">请使用您的账户凭证访问系统</p>
            {isAuthenticated && user && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <div className="text-blue-800">当前已登录：<b>{user.fullName}</b>（{user.roleName}）</div>
                <button
                  onClick={handleLogoutDemo}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  点击退出登录以切换账号
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-red-700">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码（演示账号：demo123456）"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLogin(e as any);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600" defaultChecked />
                <span className="text-gray-600">记住我</span>
              </label>
              <span className="text-xs text-gray-400">演示密码：demo123456</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {isLoading ? '登录中...' : '登录系统'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3 text-center">演示账号快速登录（点击选择角色）</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickLogin(acc.role, acc.username)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    selectedRole === acc.role
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="font-medium text-gray-900">{acc.name}</div>
                  <div className="text-gray-500 mt-0.5 truncate">{acc.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
