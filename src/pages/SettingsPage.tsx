import { useState } from 'react';
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Sliders,
  Brain,
  Zap,
  Target,
  AlertTriangle,
  Save,
  RefreshCw,
  ChevronRight,
  Moon,
  Sun,
  Check
} from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';

type SettingSection = 'profile' | 'algorithm' | 'alert' | 'approval' | 'display' | 'data';

const sections: { key: SettingSection; label: string; icon: any; desc: string }[] = [
  { key: 'profile', label: '个人资料', icon: User, desc: '账户信息与密码管理' },
  { key: 'algorithm', label: '算法配置', icon: Brain, desc: '反演算法与参数默认值' },
  { key: 'alert', label: '预警阈值', icon: AlertTriangle, desc: '残差、偏移触发阈值' },
  { key: 'approval', label: '审批流程', icon: Shield, desc: '两级审批权限配置' },
  { key: 'display', label: '显示设置', icon: Palette, desc: '主题、图表、可视化' },
  { key: 'data', label: '数据管理', icon: Database, desc: '存储、导出、清理策略' }
];

export default function SettingsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const [activeSection, setActiveSection] = useState<SettingSection>('algorithm');
  const [saved, setSaved] = useState(false);

  const user = currentUser || {
    id: 'u1',
    username: 'eng1',
    fullName: '李工程师',
    title: '临床工程师',
    roleCode: 'engineer',
    roleName: '临床工程师',
    email: 'li.engineer@hospital.cn',
    phone: '138****8888',
    department: '神经电生理实验室'
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="text-sm text-gray-500 mt-1">个性化配置、算法参数与系统级管理</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? '已保存' : '保存更改'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold">
                  {user.fullName.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{user.fullName}</div>
                  <div className="text-xs text-gray-500">{user.roleName}</div>
                </div>
              </div>
            </div>
            <nav className="p-2">
              {sections.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => setActiveSection(s.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      activeSection === s.key
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="flex-1 text-left">
                      <div>{s.label}</div>
                      <div className={`text-xs ${activeSection === s.key ? 'text-blue-500' : 'text-gray-400'}`}>
                        {s.desc}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="col-span-9 space-y-6">
          {activeSection === 'profile' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                个人资料
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">姓名</label>
                  <input type="text" defaultValue={user.fullName} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
                  <input type="text" defaultValue={user.username} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
                  <input type="email" defaultValue={(user as any).email || 'li.engineer@hospital.cn'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">手机</label>
                  <input type="tel" defaultValue={(user as any).phone || '138****8888'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">职称</label>
                  <input type="text" defaultValue={user.title} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">科室</label>
                  <input type="text" defaultValue={(user as any).department || '神经电生理实验室'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-900 mb-3">修改密码</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">当前密码</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">新密码</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">确认新密码</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'algorithm' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-purple-600" />
                  默认反演算法
                </h3>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { key: 'sloreta', name: 'sLORETA', desc: '标准化低分辨率' },
                    { key: 'beamforming', name: 'Beamforming', desc: '波束成形' },
                    { key: 'mnls', name: 'MNLS', desc: '最低模最小二乘' },
                    { key: 'loreta', name: 'LORETA', desc: '低分辨率层析' },
                    { key: 'dics', name: 'DICS', desc: '动态成像相干谱' }
                  ].map((a, i) => (
                    <button
                      key={a.key}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        i === 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 text-sm">{a.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{a.desc}</div>
                      {i === 0 && <div className="text-xs text-blue-600 mt-2 flex items-center gap-1"><Check className="w-3 h-3" />默认</div>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  默认计算参数
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">正则化参数 (λ)</label>
                    <input type="number" step="0.01" defaultValue={0.05} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">时间窗长度 (ms)</label>
                    <input type="number" defaultValue={100} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">重叠率 (%)</label>
                    <input type="number" defaultValue={50} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">最大迭代次数</label>
                    <input type="number" defaultValue={1000} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">收敛阈值</label>
                    <input type="text" defaultValue="1e-6" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">BEM求解方法</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>对称边界元法 (sBEM)</option>
                      <option>有限元法 (FEM)</option>
                      <option>边界元法 (BEM)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-amber-600" />
                  TMS刺激参数
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">默认刺激模式</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>θ爆发刺激 (TBS)</option>
                      <option>重复经颅磁刺激 (rTMS)</option>
                      <option>单脉冲</option>
                      <option>双脉冲</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">默认线圈类型</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Figure-8 八字线圈</option>
                      <option>Circular 圆形线圈</option>
                      <option>H-Coil 脑深部线圈</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">最大电流强度 (A/m²)</label>
                    <input type="number" defaultValue={25} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'alert' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  预警阈值配置
                </h3>
                <div className="space-y-5">
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">偶极子拟合残差阈值</div>
                        <div className="text-xs text-gray-500 mt-0.5">超过该值触发残差预警</div>
                      </div>
                      <div className="w-40">
                        <div className="flex items-center gap-2">
                          <input type="number" defaultValue={10} className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">连续源中心偏移阈值</div>
                        <div className="text-xs text-gray-500 mt-0.5">两个连续时间窗偏移超过该值触发预警</div>
                      </div>
                      <div className="w-40">
                        <div className="flex items-center gap-2">
                          <input type="number" defaultValue={5} step="0.1" className="w-full px-3 py-1.5 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                          <span className="text-sm text-gray-600">mm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">患者连续定位偏差阈值</div>
                        <div className="text-xs text-gray-500 mt-0.5">同一患者连续3次偏差超该值自动暂停并通知首席科学家</div>
                      </div>
                      <div className="w-40">
                        <div className="flex items-center gap-2">
                          <input type="number" defaultValue={8} step="0.1" className="w-full px-3 py-1.5 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                          <span className="text-sm text-gray-600">mm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">计算超时阈值</div>
                        <div className="text-xs text-gray-500 mt-0.5">单步计算超过该时间触发超时预警</div>
                      </div>
                      <div className="w-40">
                        <div className="flex items-center gap-2">
                          <input type="number" defaultValue={600} className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <span className="text-sm text-gray-600">秒</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  通知推送配置
                </h3>
                <div className="space-y-3">
                  {[
                    { label: '站内消息', desc: '系统内实时弹窗和消息中心', checked: true },
                    { label: '邮件通知', desc: '发送至绑定邮箱', checked: true },
                    { label: '短信提醒', desc: '严重级别预警发送短信', checked: false },
                    { label: '企业微信推送', desc: '推送至企业微信应用', checked: true }
                  ].map((n, i) => (
                    <label key={n.label} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{n.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{n.desc}</div>
                      </div>
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${i !== 2 ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${i !== 2 ? 'left-[18px]' : 'left-0.5'}`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'approval' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  两级审批流程配置
                </h3>
                <div className="flex items-center gap-4 mb-6">
                  {[
                    { level: 1, title: '临床工程师审批', desc: '验证源定位合理性', roles: ['临床工程师', '系统管理员'] },
                    { level: 2, title: '神经内科主任审批', desc: '确认治疗可行性', roles: ['神经内科主任', '系统管理员'] }
                  ].map((lvl, i) => (
                    <div key={lvl.level} className="flex-1">
                      <div className={`p-5 rounded-xl border-2 ${i === 0 ? 'border-indigo-200 bg-indigo-50' : 'border-purple-200 bg-purple-50'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'}`}>
                            {lvl.level}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{lvl.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{lvl.desc}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                          可审批角色：{lvl.roles.join('、')}
                        </div>
                      </div>
                      {i === 0 && (
                        <div className="flex justify-center my-2">
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'display' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Palette className="w-4 h-4 text-pink-600" />
                  主题外观
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={toggleTheme}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    <Sun className="w-6 h-6 text-amber-500 mb-2" />
                    <div className="font-semibold text-sm text-gray-900">浅色模式</div>
                    <div className="text-xs text-gray-500 mt-1">明亮简洁的界面</div>
                  </button>
                  <button
                    onClick={toggleTheme}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${theme === 'dark' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    <Moon className="w-6 h-6 text-indigo-500 mb-2" />
                    <div className="font-semibold text-sm text-gray-900">深色模式</div>
                    <div className="text-xs text-gray-500 mt-1">护眼深色主题</div>
                  </button>
                  <div className="p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 cursor-pointer">
                    <Settings className="w-6 h-6 text-gray-500 mb-2" />
                    <div className="font-semibold text-sm text-gray-900">跟随系统</div>
                    <div className="text-xs text-gray-500 mt-1">自动切换主题</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-teal-600" />
                  可视化默认配置
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">头皮透明度</label>
                    <input type="range" min="0" max="100" defaultValue={30} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">脑皮层透明度</label>
                    <input type="range" min="0" max="100" defaultValue={90} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">3D场景自动旋转</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option>关闭</option>
                      <option selected>慢速</option>
                      <option>中速</option>
                      <option>快速</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">图表降采样点数</label>
                    <input type="number" defaultValue={1000} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Database className="w-4 h-4 text-cyan-600" />
                  数据存储策略
                </h3>
                <div className="space-y-3">
                  {[
                    { label: '原始MRI/EEG数据保留时长', value: '180 天', desc: '超过后自动归档至冷存储' },
                    { label: '计算中间结果保留时长', value: '90 天', desc: '包含头模型、正问题矩阵等' },
                    { label: '最终定位结果保留时长', value: '永久', desc: '源结果、靶点方案、PDF报告' },
                    { label: '日志与监控数据保留时长', value: '365 天', desc: '操作日志、预警记录、审批记录' }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                      </div>
                      <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <RefreshCw className="w-4 h-4 text-rose-600" />
                  数据维护
                </h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-left">
                    <div>
                      <div className="text-sm font-medium text-gray-900">立即清理临时缓存</div>
                      <div className="text-xs text-gray-500 mt-0.5">释放约 2.3 GB 临时计算文件</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-left">
                    <div>
                      <div className="text-sm font-medium text-gray-900">重建全文搜索索引</div>
                      <div className="text-xs text-gray-500 mt-0.5">优化患者、任务搜索速度</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 rounded-xl border border-red-200 hover:bg-red-50 text-left">
                    <div>
                      <div className="text-sm font-medium text-red-600">注销并退出登录</div>
                      <div className="text-xs text-red-500 mt-0.5">清除当前会话所有缓存数据</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
