import { useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  TrendingUp,
  Target,
  Brain,
  Activity,
  AlertTriangle,
  FileCheck,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  Radar,
  RefreshCw,
  Download,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { useAnalyticsStore } from '@/store';

export default function AnalyticsPage() {
  const fetchDashboard = useAnalyticsStore((s) => s.fetchDashboard);
  const summary = useAnalyticsStore((s) => s.summary);
  const trends = useAnalyticsStore((s) => s.trends);
  const radar = useAnalyticsStore((s) => s.radar);
  const taskDistribution = useAnalyticsStore((s) => s.taskDistribution);
  const regionPerformance = useAnalyticsStore((s) => s.regionPerformance);
  const algorithmPerformance = useAnalyticsStore((s) => s.algorithmPerformance);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const mockSummary = summary || {
    totalTasks: 156,
    completedTasks: 128,
    completionRate: 82.1,
    avgAccuracy: 94.7,
    avgCoverage: 89.3,
    alertCount: 7,
    pendingApprovals: 12,
    avgComputationTime: 23.5
  };

  const mockTrends = trends || {
    dates: ['06/08', '06/09', '06/10', '06/11', '06/12', '06/13', '06/14'],
    taskCounts: [18, 22, 25, 20, 28, 24, 19],
    completedCounts: [15, 20, 22, 18, 25, 20, 16],
    accuracyTrend: [93.2, 94.1, 93.8, 95.2, 94.5, 95.0, 94.7],
    coverageTrend: [88.1, 88.9, 89.5, 88.7, 90.1, 89.6, 89.3],
    alertTrend: [1, 2, 0, 1, 2, 1, 0]
  };

  const mockRadar = radar || {
    categories: ['定位精度', '靶点覆盖率', '聚焦指数', '计算效率', '临床有效率', '专家满意度'],
    current: [94.7, 89.3, 87.5, 91.2, 88.6, 92.0],
    target: [95, 90, 90, 90, 90, 90]
  };

  const mockDistribution = taskDistribution || {
    statuses: ['已完成', '计算中', '待审批', '预警', '异常'],
    counts: [128, 18, 12, 5, 3],
    colors: ['#26A69A', '#42A5F5', '#FF9800', '#EF5350', '#D32F2F']
  };

  const mockRegion = regionPerformance || {
    regions: ['左DLPFC', '右DLPFC', 'M1', 'SMA', '颞叶', '枕叶', '顶叶'],
    accuracy: [96.2, 95.1, 93.8, 92.5, 94.7, 95.8, 91.2],
    coverage: [91.5, 89.2, 87.3, 85.1, 88.6, 92.4, 84.7],
    taskCount: [45, 38, 22, 15, 18, 10, 8]
  };

  const mockAlgorithm = algorithmPerformance || {
    algorithms: ['sLORETA', 'Beamforming', 'MNLS', 'LORETA', 'DICS'],
    accuracy: [95.2, 93.8, 92.5, 91.8, 90.6],
    speed: [22.5, 35.2, 41.8, 28.6, 45.3],
    usageCount: [68, 42, 25, 15, 6]
  };

  const trendChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['任务数', '完成数', '定位精度', '靶点覆盖'], top: 0 },
    grid: { left: 40, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: mockTrends.dates, axisLine: { lineStyle: { color: '#E5E7EB' } } },
    yAxis: [
      { type: 'value', name: '数量', min: 0, splitLine: { lineStyle: { color: '#F3F4F6' } } },
      { type: 'value', name: '百分比(%)', min: 85, max: 100, splitLine: { show: false } }
    ],
    series: [
      { name: '任务数', type: 'bar', data: mockTrends.taskCounts, itemStyle: { color: '#93C5FD' }, barWidth: 16 },
      { name: '完成数', type: 'bar', data: mockTrends.completedCounts, itemStyle: { color: '#3B82F6' }, barWidth: 16 },
      { name: '定位精度', type: 'line', yAxisIndex: 1, data: mockTrends.accuracyTrend, smooth: true, itemStyle: { color: '#10B981' }, lineStyle: { width: 2 } },
      { name: '靶点覆盖', type: 'line', yAxisIndex: 1, data: mockTrends.coverageTrend, smooth: true, itemStyle: { color: '#F59E0B' }, lineStyle: { width: 2 } }
    ]
  };

  const radarChartOption = {
    tooltip: {},
    legend: { data: ['当前指标', '目标值'], top: 0 },
    radar: {
      indicator: mockRadar.categories.map((c) => ({ name: c, max: 100 })),
      radius: '65%',
      axisName: { color: '#6B7280', fontSize: 11 },
      splitArea: { areaStyle: { color: ['#FAFAFA', '#F3F4F6'] } }
    },
    series: [{
      type: 'radar',
      data: [
        { value: mockRadar.current, name: '当前指标', areaStyle: { color: 'rgba(59, 130, 246, 0.2)' }, lineStyle: { color: '#3B82F6' }, itemStyle: { color: '#3B82F6' } },
        { value: mockRadar.target, name: '目标值', areaStyle: { color: 'rgba(16, 185, 129, 0.1)' }, lineStyle: { color: '#10B981', type: 'dashed' }, itemStyle: { color: '#10B981' } }
      ]
    }]
  };

  const pieChartOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      label: { show: false },
      data: mockDistribution.statuses.map((s, i) => ({
        name: s,
        value: mockDistribution.counts[i],
        itemStyle: { color: mockDistribution.colors[i] }
      }))
    }]
  };

  const regionChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['定位精度', '靶点覆盖率', '任务数'], top: 0 },
    grid: { left: 40, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: mockRegion.regions, axisLine: { lineStyle: { color: '#E5E7EB' } } },
    yAxis: [
      { type: 'value', name: '百分比(%)', min: 80, max: 100, splitLine: { lineStyle: { color: '#F3F4F6' } } },
      { type: 'value', name: '任务数', min: 0, splitLine: { show: false } }
    ],
    series: [
      { name: '定位精度', type: 'bar', data: mockRegion.accuracy, itemStyle: { color: '#3B82F6' }, barWidth: 18 },
      { name: '靶点覆盖率', type: 'bar', data: mockRegion.coverage, itemStyle: { color: '#10B981' }, barWidth: 18 },
      { name: '任务数', type: 'line', yAxisIndex: 1, data: mockRegion.taskCount, smooth: true, itemStyle: { color: '#F59E0B' }, lineStyle: { width: 2 } }
    ]
  };

  const algorithmChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['精度', '计算速度(s)', '使用次数'], top: 0 },
    grid: { left: 40, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: mockAlgorithm.algorithms, axisLine: { lineStyle: { color: '#E5E7EB' } } },
    yAxis: [
      { type: 'value', name: '精度(%)/速度(s)', min: 0, max: 100, splitLine: { lineStyle: { color: '#F3F4F6' } } },
      { type: 'value', name: '使用次数', min: 0, splitLine: { show: false } }
    ],
    series: [
      { name: '精度', type: 'bar', data: mockAlgorithm.accuracy, itemStyle: { color: '#6366F1' }, barWidth: 16 },
      { name: '计算速度(s)', type: 'bar', data: mockAlgorithm.speed, itemStyle: { color: '#8B5CF6' }, barWidth: 16 },
      { name: '使用次数', type: 'line', yAxisIndex: 1, data: mockAlgorithm.usageCount, smooth: true, itemStyle: { color: '#EC4899' }, lineStyle: { width: 2 } }
    ]
  };

  const statCards = [
    { label: '总任务数', value: mockSummary.totalTasks, icon: FileCheck, color: 'blue', sub: `完成率 ${mockSummary.completionRate}%` },
    { label: '平均定位精度', value: `${mockSummary.avgAccuracy}%`, icon: Target, color: 'green', sub: '目标 95%' },
    { label: '平均靶点覆盖', value: `${mockSummary.avgCoverage}%`, icon: Brain, color: 'indigo', sub: '目标 90%' },
    { label: '平均计算耗时', value: `${mockSummary.avgComputationTime}min`, icon: Clock, color: 'purple', sub: '中位数 21min' },
    { label: '预警总数', value: mockSummary.alertCount, icon: AlertTriangle, color: 'amber', sub: '7天内' },
    { label: '待审批', value: mockSummary.pendingApprovals, icon: Activity, color: 'rose', sub: '需及时处理' }
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'from-blue-50 to-white', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    green: { bg: 'from-green-50 to-white', text: 'text-green-600', iconBg: 'bg-green-100' },
    indigo: { bg: 'from-indigo-50 to-white', text: 'text-indigo-600', iconBg: 'bg-indigo-100' },
    purple: { bg: 'from-purple-50 to-white', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    amber: { bg: 'from-amber-50 to-white', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    rose: { bg: 'from-rose-50 to-white', text: 'text-rose-600', iconBg: 'bg-rose-100' }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据分析</h1>
          <p className="text-sm text-gray-500 mt-1">系统性能指标、临床有效性评估与算法对比分析</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Calendar className="w-4 h-4" />
            最近7天
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => fetchDashboard()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            导出报表
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const c = colorMap[card.color];
          return (
            <div key={card.label} className={`bg-gradient-to-br ${c.bg} rounded-xl border border-gray-200 p-5`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${c.text}`}>{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${c.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${c.text}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <LineChart className="w-4 h-4 text-blue-600" />
              性能趋势
            </h3>
            <span className="text-xs text-gray-400">近7天</span>
          </div>
          <div className="h-[300px]">
            <ReactECharts option={trendChartOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="col-span-4 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-teal-600" />
              任务状态分布
            </h3>
          </div>
          <div className="h-[300px]">
            <ReactECharts option={pieChartOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-6 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Radar className="w-4 h-4 text-indigo-600" />
              临床有效性雷达图
            </h3>
          </div>
          <div className="h-[340px]">
            <ReactECharts option={radarChartOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="col-span-6 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-600" />
              各脑区性能对比
            </h3>
          </div>
          <div className="h-[340px]">
            <ReactECharts option={regionChartOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            算法性能对比分析
          </h3>
        </div>
        <div className="h-[340px]">
          <ReactECharts option={algorithmChartOption} style={{ height: '100%', width: '100%' }} />
        </div>
      </div>
    </div>
  );
}
