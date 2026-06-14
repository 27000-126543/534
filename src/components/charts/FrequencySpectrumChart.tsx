import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { SourceTimeSeriesData, FrequencyBand } from 'shared/types/api';
import { FrequencyBandText } from 'shared/types/enums';

interface FrequencySpectrumChartProps {
  timeSeriesData?: SourceTimeSeriesData;
  selectedRegion?: string;
  highlightBands?: FrequencyBand[];
  height?: string | number;
}

export function FrequencySpectrumChart({
  timeSeriesData,
  selectedRegion,
  highlightBands = [],
  height = 300
}: FrequencySpectrumChartProps) {
  const spectrumData = useMemo(() => {
    const fftSize = 1024;
    const freqResolution = (timeSeriesData?.samplingRate || 256) / fftSize;
    const frequencies = Array.from(
      { length: fftSize / 2 },
      (_, i) => i * freqResolution
    );

    const regions = timeSeriesData?.regions || ['默认'];
    const regionIdx = selectedRegion
      ? Math.max(0, regions.indexOf(selectedRegion))
      : 0;
    const signal = timeSeriesData?.data?.[regionIdx] ||
      Array.from({ length: fftSize }, (_, i) => {
        const t = i / 256;
        return (
          0.5 * Math.sin(2 * Math.PI * 10 * t) +
          0.3 * Math.sin(2 * Math.PI * 20 * t) +
          0.2 * Math.sin(2 * Math.PI * 8 * t) +
          (Math.random() - 0.5) * 0.1
        );
      });

    const fft = frequencies.map((freq, i) => {
      let magnitude = 0;
      for (let n = 0; n < Math.min(signal.length, fftSize); n++) {
        magnitude += signal[n] * Math.exp((-2 * Math.PI * i * n) / fftSize);
      }
      const absMag = Math.abs(magnitude);
      return 20 * Math.log10(absMag + 1e-10);
    });

    return { frequencies, spectrum: fft };
  }, [timeSeriesData, selectedRegion]);

  const option = useMemo(() => {
    const { frequencies, spectrum } = spectrumData;

    const bandColors = {
      delta: 'rgba(126, 87, 194, 0.3)',
      theta: 'rgba(66, 165, 245, 0.3)',
      alpha: 'rgba(38, 166, 154, 0.3)',
      beta: 'rgba(255, 152, 0, 0.3)',
      gamma: 'rgba(239, 83, 80, 0.3)'
    };

    const bandRanges = {
      delta: [1, 4],
      theta: [4, 8],
      alpha: [8, 13],
      beta: [13, 30],
      gamma: [30, 100]
    };

    const markAreas = Object.entries(bandRanges).map(([band, range]) => ({
      silent: false,
      itemStyle: {
        color: highlightBands.includes(band as FrequencyBand)
          ? bandColors[band as keyof typeof bandColors].replace('0.3', '0.5')
          : bandColors[band as keyof typeof bandColors]
      },
      label: {
        show: true,
        position: 'insideTop',
        formatter: FrequencyBandText[band as FrequencyBand] || band,
        color: '#64748b',
        fontSize: 10
      },
      data: [
        [
          { xAxis: range[0] },
          { xAxis: Math.min(range[1], frequencies[frequencies.length - 1]) }
        ]
      ]
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#475569',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params: any) => {
          const p = params[0];
          return `<div>
            <div style="font-weight:600;margin-bottom:4px">${p.value[0].toFixed(2)} Hz</div>
            <div>功率: ${p.value[1].toFixed(2)} dB</div>
          </div>`;
        }
      },
      grid: {
        left: 60,
        right: 20,
        top: 40,
        bottom: 40
      },
      xAxis: {
        type: 'value',
        name: '频率 (Hz)',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { color: '#94a3b8', fontSize: 12 },
        min: 0,
        max: 60,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      yAxis: {
        type: 'value',
        name: '功率 (dB)',
        nameTextStyle: { color: '#94a3b8', fontSize: 12 },
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 2,
            color: '#42A5F5'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(66, 165, 245, 0.4)' },
                { offset: 1, color: 'rgba(66, 165, 245, 0.05)' }
              ]
            }
          },
          data: frequencies.map((f, i) => [f, spectrum[i]]),
          markArea: {
            silent: false,
            data: markAreas as any
          }
        }
      ]
    };
  }, [spectrumData, highlightBands]);

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-200 font-medium">频率谱分析</h3>
        {selectedRegion && (
          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
            {selectedRegion}
          </span>
        )}
      </div>
      <ReactECharts option={option} style={{ height }} opts={{ renderer: 'canvas' }} />
    </div>
  );
}
