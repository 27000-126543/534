import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ConfidenceEllipsoid, DipoleParameters } from '../../../../shared/types/api';

interface ConfidenceEllipse2DProps {
  ellipsoid?: ConfidenceEllipsoid;
  dipole?: DipoleParameters;
  views?: ('axial' | 'sagittal' | 'coronal')[];
  height?: string | number;
}

export function ConfidenceEllipse2D({
  ellipsoid,
  dipole,
  views = ['axial', 'sagittal', 'coronal'],
  height = 280
}: ConfidenceEllipse2DProps) {
  const mockEllipsoid = useMemo((): ConfidenceEllipsoid => {
    if (ellipsoid) return ellipsoid;
    return {
      center: [-0.5, 4.2, 3.8],
      radii: [5.2, 3.8, 6.1],
      rotation: [
        [0.98, -0.1, 0.15],
        [0.12, 0.96, -0.2],
        [-0.13, 0.22, 0.95]
      ],
      confidenceLevel: 0.95,
      unit: 'mm'
    };
  }, [ellipsoid]);

  const mockDipole = useMemo((): DipoleParameters => {
    if (dipole) return dipole;
    return {
      position: [-0.5, 4.2, 3.8],
      moment: [0.3, 0.8, 0.5],
      goodnessOfFit: 0.92,
      residualError: 5.8
    };
  }, [dipole]);

  const generateEllipse = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rotationDeg: number,
    steps = 100
  ) => {
    const points: [number, number][] = [];
    const rotRad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);

    for (let i = 0; i <= steps; i++) {
      const theta = (2 * Math.PI * i) / steps;
      const xLocal = rx * Math.cos(theta);
      const yLocal = ry * Math.sin(theta);
      const x = cx + xLocal * cos - yLocal * sin;
      const y = cy + xLocal * sin + yLocal * cos;
      points.push([Number(x.toFixed(2)), Number(y.toFixed(2))]);
    }
    return points;
  };

  const viewConfigs = {
    axial: {
      title: '轴状面 (Axial)',
      xLabel: 'X (左右 mm)',
      yLabel: 'Y (前后 mm)',
      centerIdx: [0, 1] as [number, number],
      radiiIdx: [0, 1] as [number, number],
      rotationIdx: [[0, 0], [1, 1]] as [[number, number], [number, number]]
    },
    sagittal: {
      title: '矢状面 (Sagittal)',
      xLabel: 'Y (前后 mm)',
      yLabel: 'Z (上下 mm)',
      centerIdx: [1, 2] as [number, number],
      radiiIdx: [1, 2] as [number, number],
      rotationIdx: [[1, 1], [2, 2]] as [[number, number], [number, number]]
    },
    coronal: {
      title: '冠状面 (Coronal)',
      xLabel: 'X (左右 mm)',
      yLabel: 'Z (上下 mm)',
      centerIdx: [0, 2] as [number, number],
      radiiIdx: [0, 2] as [number, number],
      rotationIdx: [[0, 0], [2, 2]] as [[number, number], [number, number]]
    }
  };

  const renderView = (view: 'axial' | 'sagittal' | 'coronal') => {
    const config = viewConfigs[view];
    const cx = mockEllipsoid.center[config.centerIdx[0]];
    const cy = mockEllipsoid.center[config.centerIdx[1]];
    const rx = mockEllipsoid.radii[config.radiiIdx[0]];
    const ry = mockEllipsoid.radii[config.radiiIdx[1]];
    const r00 = mockEllipsoid.rotation[config.rotationIdx[0][0]][config.rotationIdx[0][1]];
    const r11 = mockEllipsoid.rotation[config.rotationIdx[1][0]][config.rotationIdx[1][1]];
    const rotationDeg = (Math.atan2(r11, r00) * 180) / Math.PI;

    const dipoleX = mockDipole.position[config.centerIdx[0]];
    const dipoleY = mockDipole.position[config.centerIdx[1]];

    const ellipsePoints95 = generateEllipse(cx, cy, rx, ry, rotationDeg);
    const ellipsePoints99 = generateEllipse(cx, cy, rx * 1.3, ry * 1.3, rotationDeg);
    const ellipsePoints90 = generateEllipse(cx, cy, rx * 0.85, ry * 0.85, rotationDeg);

    const axisRange = Math.max(rx, ry) * 2;
    const minX = cx - axisRange - 5;
    const maxX = cx + axisRange + 5;
    const minY = cy - axisRange - 5;
    const maxY = cy + axisRange + 5;

    const momentX = mockDipole.moment[config.centerIdx[0]];
    const momentY = mockDipole.moment[config.centerIdx[1]];
    const momentLen = Math.sqrt(momentX ** 2 + momentY ** 2);
    const arrowScale = 8;

    return {
      backgroundColor: 'transparent',
      title: {
        text: config.title,
        left: 'center',
        top: 0,
        textStyle: { color: '#e2e8f0', fontSize: 13, fontWeight: 500 }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#475569',
        textStyle: { color: '#e2e8f0', fontSize: 11 }
      },
      grid: {
        left: 50,
        right: 20,
        top: 35,
        bottom: 40
      },
      xAxis: {
        type: 'value',
        min: minX,
        max: maxX,
        name: config.xLabel,
        nameLocation: 'middle',
        nameGap: 20,
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 9 },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      yAxis: {
        type: 'value',
        min: minY,
        max: maxY,
        name: config.yLabel,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 9 },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      series: [
        {
          name: '99% 置信',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 1, color: 'rgba(126, 87, 194, 0.6)', type: 'dashed' },
          areaStyle: { color: 'rgba(126, 87, 194, 0.08)' },
          data: ellipsePoints99
        },
        {
          name: '95% 置信',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2, color: '#42A5F5' },
          areaStyle: { color: 'rgba(66, 165, 245, 0.15)' },
          data: ellipsePoints95
        },
        {
          name: '90% 置信',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 1, color: 'rgba(38, 166, 154, 0.6)', type: 'dotted' },
          data: ellipsePoints90
        },
        {
          name: '偶极子位置',
          type: 'scatter',
          symbol: 'circle',
          symbolSize: 12,
          itemStyle: {
            color: mockDipole.goodnessOfFit >= 0.9 ? '#26A69A' : mockDipole.goodnessOfFit >= 0.7 ? '#FF9800' : '#EF5350',
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: 'rgba(255,255,255,0.3)'
          },
          z: 10,
          data: [[dipoleX, dipoleY]]
        },
        {
          name: '偶极子方向',
          type: 'line',
          showSymbol: false,
          lineStyle: {
            width: 2.5,
            color: mockDipole.goodnessOfFit >= 0.9 ? '#26A69A' : mockDipole.goodnessOfFit >= 0.7 ? '#FF9800' : '#EF5350'
          },
          z: 9,
          data: [
            [dipoleX, dipoleY],
            [
              dipoleX + (momentX / (momentLen || 1)) * arrowScale,
              dipoleY + (momentY / (momentLen || 1)) * arrowScale
            ]
          ],
          markPoint: {
            symbol: 'triangle',
            symbolSize: 8,
            symbolRotate: (Math.atan2(momentY, momentX) * 180) / Math.PI + 90,
            itemStyle: {
              color: mockDipole.goodnessOfFit >= 0.9 ? '#26A69A' : mockDipole.goodnessOfFit >= 0.7 ? '#FF9800' : '#EF5350'
            },
            data: [
              {
                coord: [
                  dipoleX + (momentX / (momentLen || 1)) * arrowScale,
                  dipoleY + (momentY / (momentLen || 1)) * arrowScale
                ]
              }
            ]
          }
        }
      ]
    };
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-200 font-medium">偶极子置信椭圆</h3>
        <div className="flex gap-3 items-center text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: mockDipole.goodnessOfFit >= 0.9 ? '#26A69A' : mockDipole.goodnessOfFit >= 0.7 ? '#FF9800' : '#EF5350' }}></span>
            偶极子 (GoF: {(mockDipole.goodnessOfFit * 100).toFixed(1)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-blue-500"></span>
            95% 置信
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-purple-500 border-dashed" style={{ borderStyle: 'dashed' }}></span>
            99% 置信
          </span>
        </div>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${views.length}, 1fr)` }}>
        {views.map((view) => (
          <ReactECharts
            key={view}
            option={renderView(view)}
            style={{ height }}
            opts={{ renderer: 'canvas' }}
          />
        ))}
      </div>
    </div>
  );
}
