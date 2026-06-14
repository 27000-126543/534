import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { SourceTimeSeriesData } from 'shared/types/api';

interface SourceTimeSeriesChartProps {
  data?: SourceTimeSeriesData;
  selectedRegions?: string[];
  timeRange?: [number, number];
  height?: string | number;
  onRegionSelect?: (regions: string[]) => void;
}

export function SourceTimeSeriesChart({
  data,
  selectedRegions = [],
  timeRange,
  height = 400,
  onRegionSelect
}: SourceTimeSeriesChartProps) {
  const mockData: SourceTimeSeriesData = useMemo(() => {
    if (data) return data;
    const regions = [
      '前额叶', '运动皮层', '顶叶', '颞叶', '枕叶',
      '左侧DLPFC', '右侧DLPFC', '辅助运动区'
    ];
    const labels = regions.map((_, i) => `R${i + 1}`);
    const samplingRate = 256;
    const duration = 5;
    const timePoints = Array.from(
      { length: samplingRate * duration },
      (_, i) => i / samplingRate
    );
    const seriesData = regions.map((_, regionIdx) =>
      timePoints.map((t) => {
        const freq = 2 + regionIdx * 0.5;
        const amplitude = 0.3 + regionIdx * 0.05;
        const noise = (Math.random() - 0.5) * 0.1;
        return amplitude * Math.sin(2 * Math.PI * freq * t) + noise;
      })
    );

    return {
      labels,
      regions,
      data: seriesData,
      timePoints,
      unit: 'nA·m',
      samplingRate
    };
  }, [data]);

  const option = useMemo(() => {
    const { regions, data: seriesData, timePoints, unit } = mockData;
    const displayRegions = selectedRegions.length > 0
      ? regions.filter((r) => selectedRegions.includes(r))
      : regions;
    const displayIndices = displayRegions.map((r) => regions.indexOf(r));

    const colors = [
      '#42A5F5', '#EF5350', '#26A69A', '#FF9800',
      '#7E57C2', '#EC407A', '#66BB6A', '#29B6F6'
    ];

    const startTime = timeRange ? timeRange[0] : timePoints[0];
    const endTime = timeRange ? timeRange[1] : timePoints[timePoints.length - 1];
    const startIdx = Math.floor(startTime * mockData.samplingRate);
    const endIdx = Math.min(Math.ceil(endTime * mockData.samplingRate), timePoints.length);
    const slicedTime = timePoints.slice(startIdx, endIdx);

    const series = displayIndices.map((idx, i) => {
      const regionName = regions[idx];
      const values = seriesData[idx].slice(startIdx, endIdx);
      const offset = displayIndices.length - 1 - i;
      const spacing = 1.2;

      return {
        name: regionName,
        type: 'line',
        smooth: true,
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: {
          width: 1.2,
          color: colors[i % colors.length]
        },
        itemStyle: {
          color: colors[i % colors.length]
        },
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 2.5
          }
        },
        data: slicedTime.map((t, j) => [t, values[j] + offset * spacing])
      };
    });

    const yAxisLabels = displayIndices.map((idx, i) => {
      const offset = displayIndices.length - 1 - i;
      return {
        value: offset * 1.2,
        label: {
          show: true,
          position: 'left',
          formatter: regions[idx],
          color: '#94a3b8',
          fontSize: 11,
          padding: [0, 0, 0, -10]
        },
        lineStyle: {
          color: '#334155',
          type: 'dashed',
          width: 1
        }
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#475569',
        textStyle: {
          color: '#e2e8f0',
          fontSize: 12
        },
        formatter: (params: any) => {
          if (!params.length) return '';
          const time = params[0].value[0].toFixed(3);
          let html = `<div style="font-weight:600;margin-bottom:8px">时间: ${time}s</div>`;
          params.forEach((p: any) => {
            const val = (p.value[1] - (displayIndices.length - 1 - displayRegions.indexOf(p.seriesName)) * 1.2).toFixed(4);
            html += `<div style="display:flex;align-items:center;gap:6px;margin:4px 0">
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span>${p.seriesName}: ${val} ${unit}</span>
            </div>`;
          });
          return html;
        }
      },
      legend: {
        show: false,
        selectedMode: 'multiple',
        top: 0,
        right: 10,
        textStyle: { color: '#cbd5e1', fontSize: 11 }
      },
      grid: {
        left: 100,
        right: 30,
        top: 20,
        bottom: 50
      },
      xAxis: {
        type: 'value',
        name: '时间 (s)',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { color: '#94a3b8', fontSize: 12 },
        min: slicedTime[0],
        max: slicedTime[slicedTime.length - 1],
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      yAxis: {
        type: 'value',
        show: false,
        splitLine: {
          show: true,
          lineStyle: {
            color: '#1e293b',
            type: 'dashed'
          }
        },
        splitArea: { show: false }
      },
      graphic: yAxisLabels.map((item) => ({
        type: 'text',
        left: 90,
        top: 'center',
        style: {
          text: item.label.formatter,
          fill: '#94a3b8',
          fontSize: 11,
          textAlign: 'right'
        },
        position: [-80, 0]
      })),
      series,
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: 'ctrl',
          moveOnMouseMove: true
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 20,
          bottom: 10,
          backgroundColor: '#1e293b',
          fillerColor: 'rgba(66, 165, 245, 0.2)',
          borderColor: '#475569',
          handleStyle: {
            color: '#42A5F5',
            borderColor: '#42A5F5'
          },
          textStyle: { color: '#94a3b8' }
        }
      ]
    };
  }, [mockData, selectedRegions, timeRange, displayRegions, displayIndices, colors, slicedTime, regions, seriesData, unit]);

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-200 font-medium">源活动时序曲线</h3>
        <div className="flex gap-2">
          <span className="text-xs text-slate-400">
            采样率: {mockData.samplingRate} Hz
          </span>
          <span className="text-xs text-slate-400">
            时长: {mockData.timePoints[mockData.timePoints.length - 1].toFixed(1)} s
          </span>
        </div>
      </div>
      <ReactECharts
        option={option}
        style={{ height }}
        opts={{ renderer: 'canvas' }}
        onEvents={{
          legendselectchanged: (params: any) => {
            const selected = Object.keys(params.selected).filter(
              (k) => params.selected[k]
            );
            onRegionSelect?.(selected);
          }
        }}
      />
    </div>
  );
}
