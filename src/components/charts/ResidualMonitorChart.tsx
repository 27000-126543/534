import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { MonitoringMetric } from 'shared/types/api';
import { AlertSeverityColor } from 'shared/types/enums';

interface ResidualMonitorChartProps {
  metrics?: MonitoringMetric[];
  residualThreshold?: number;
  offsetThreshold?: number;
  height?: string | number;
}

export function ResidualMonitorChart({
  metrics = [],
  residualThreshold = 10,
  offsetThreshold = 5,
  height = 300
}: ResidualMonitorChartProps) {
  const displayMetrics = useMemo(() => {
    if (metrics.length > 0) return metrics;
    return Array.from({ length: 60 }, (_, i) => {
      const baseResidual = 5 + Math.sin(i * 0.2) * 2;
      const noise = (Math.random() - 0.5) * 3;
      const residual = baseResidual + noise + (i === 25 ? 6 : 0) + (i === 40 ? 7 : 0);
      const baseOffset = 2 + Math.sin(i * 0.15) * 1;
      const offsetNoise = (Math.random() - 0.5) * 1.5;
      const offset = baseOffset + offsetNoise + (i === 35 ? 4 : 0);

      return {
        id: `m-${i}`,
        timeWindow: i + 1,
        timeRange: [i * 0.1, (i + 1) * 0.1] as [number, number],
        residualError: residual,
        sourceCenter: [
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ] as [number, number, number],
        offsetFromPrevious: offset,
        isAlertTriggered: residual > residualThreshold || offset > offsetThreshold,
        createdAt: new Date(Date.now() + i * 100).toISOString()
      };
    });
  }, [metrics, residualThreshold, offsetThreshold]);

  const alertPoints = useMemo(() => {
    const residualAlerts: any[] = [];
    const offsetAlerts: any[] = [];

    displayMetrics.forEach((m, i) => {
      if (m.residualError > residualThreshold) {
        residualAlerts.push({
          coord: [i, m.residualError],
          value: m.residualError.toFixed(1),
          itemStyle: { color: AlertSeverityColor.error }
        });
      }
      if (m.offsetFromPrevious > offsetThreshold) {
        offsetAlerts.push({
          coord: [i, m.offsetFromPrevious],
          value: m.offsetFromPrevious.toFixed(1),
          itemStyle: { color: AlertSeverityColor.warning }
        });
      }
    });

    return { residualAlerts, offsetAlerts };
  }, [displayMetrics, residualThreshold, offsetThreshold]);

  const option = useMemo(() => {
    const xData = displayMetrics.map((m) => m.timeWindow);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#475569',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params: any) => {
          const windowIdx = params[0]?.dataIndex;
          const metric = displayMetrics[windowIdx];
          if (!metric) return '';
          return `<div>
            <div style="font-weight:600;margin-bottom:8px">时间窗口 #${metric.timeWindow}</div>
            <div style="display:flex;gap:8px;margin:4px 0">
              <span style="color:#ef4444">●</span>
              <span>拟合残差: <b>${metric.residualError.toFixed(2)}%</b></span>
            </div>
            <div style="display:flex;gap:8px;margin:4px 0">
              <span style="color:#f59e0b">●</span>
              <span>源中心偏移: <b>${metric.offsetFromPrevious.toFixed(2)} mm</b></span>
            </div>
            <div style="color:#94a3b8;font-size:11px;margin-top:6px">
              时间范围: ${metric.timeRange[0].toFixed(2)} - ${metric.timeRange[1].toFixed(2)} s
            </div>
            ${metric.isAlertTriggered ? '<div style="color:#ef4444;margin-top:4px">⚠️ 已触发预警</div>' : ''}
          </div>`;
        }
      },
      legend: {
        data: ['拟合残差', '源中心偏移'],
        top: 0,
        right: 10,
        textStyle: { color: '#cbd5e1', fontSize: 11 }
      },
      grid: {
        left: 60,
        right: 60,
        top: 40,
        bottom: 40
      },
      xAxis: {
        type: 'category',
        name: '时间窗口',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { color: '#94a3b8', fontSize: 12 },
        data: xData,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, interval: 9 },
        splitLine: { show: false }
      },
      yAxis: [
        {
          type: 'value',
          name: '残差 (%)',
          nameTextStyle: { color: '#ef4444', fontSize: 11 },
          axisLine: { lineStyle: { color: '#ef4444' } },
          axisLabel: { color: '#ef4444', fontSize: 11 },
          splitLine: { lineStyle: { color: '#1e293b' } },
          max: Math.max(residualThreshold * 1.5, 20)
        },
        {
          type: 'value',
          name: '偏移 (mm)',
          nameTextStyle: { color: '#f59e0b', fontSize: 11 },
          axisLine: { lineStyle: { color: '#f59e0b' } },
          axisLabel: { color: '#f59e0b', fontSize: 11 },
          splitLine: { show: false },
          max: Math.max(offsetThreshold * 1.5, 10)
        }
      ],
      series: [
        {
          name: '拟合残差',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#ef4444' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(239, 68, 68, 0.2)' },
                { offset: 1, color: 'rgba(239, 68, 68, 0.02)' }
              ]
            }
          },
          data: displayMetrics.map((m) => m.residualError),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
            label: {
              formatter: `阈值 ${residualThreshold}%`,
              color: '#ef4444',
              fontSize: 10
            },
            data: [{ yAxis: residualThreshold }]
          },
          markPoint: {
            symbol: 'circle',
            symbolSize: 8,
            data: alertPoints.residualAlerts
          }
        },
        {
          name: '源中心偏移',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#f59e0b' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.2)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0.02)' }
              ]
            }
          },
          data: displayMetrics.map((m) => m.offsetFromPrevious),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#f59e0b', type: 'dashed', width: 1 },
            label: {
              formatter: `阈值 ${offsetThreshold}mm`,
              color: '#f59e0b',
              fontSize: 10
            },
            data: [{ yAxis: offsetThreshold }]
          },
          markPoint: {
            symbol: 'diamond',
            symbolSize: 8,
            data: alertPoints.offsetAlerts
          }
        }
      ]
    };
  }, [displayMetrics, alertPoints, residualThreshold, offsetThreshold]);

  const alertCount = displayMetrics.filter((m) => m.isAlertTriggered).length;

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-200 font-medium">实时监控指标</h3>
        <div className="flex gap-4">
          {alertCount > 0 ? (
            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded flex items-center gap-1">
              <span>⚠️</span> {alertCount} 次预警
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
              <span>✓</span> 指标正常
            </span>
          )}
        </div>
      </div>
      <ReactECharts option={option} style={{ height }} opts={{ renderer: 'canvas' }} />
    </div>
  );
}
