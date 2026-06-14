import { useState } from 'react';

interface VisualizationControlsProps {
  showScalp: boolean;
  showSkull: boolean;
  showBrain: boolean;
  showDipole: boolean;
  showConfidenceEllipsoid: boolean;
  showCoil: boolean;
  showElectrodes: boolean;
  showCurrentDensity: boolean;
  wireframeScalp: boolean;
  wireframeSkull: boolean;
  wireframeBrain: boolean;
  scalpOpacity: number;
  skullOpacity: number;
  brainOpacity: number;
  timeWindowIndex: number;
  maxTimeWindows: number;
  onChange: (key: string, value: any) => void;
}

export function VisualizationControls({
  showScalp,
  showSkull,
  showBrain,
  showDipole,
  showConfidenceEllipsoid,
  showCoil,
  showElectrodes,
  showCurrentDensity,
  wireframeScalp,
  wireframeSkull,
  wireframeBrain,
  scalpOpacity,
  skullOpacity,
  brainOpacity,
  timeWindowIndex,
  maxTimeWindows,
  onChange
}: VisualizationControlsProps) {
  const [expandedSection, setExpandedSection] = useState<string>('layers');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  const CheckboxItem = ({
    label,
    checked,
    onChangeKey
  }: {
    label: string;
    checked: boolean;
    onChangeKey: string;
  }) => (
    <label className="flex items-center gap-2 cursor-pointer py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(onChangeKey, e.target.checked)}
        className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );

  const SliderItem = ({
    label,
    value,
    onChangeKey,
    min = 0,
    max = 1,
    step = 0.05
  }: {
    label: string;
    value: number;
    onChangeKey: string;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <div className="py-1">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(onChangeKey, parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
  );

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-3">
      <div>
        <button
          onClick={() => toggleSection('layers')}
          className="w-full flex items-center justify-between py-2 text-slate-200 font-medium hover:text-white"
        >
          <span>显示图层</span>
          <span className={`transition-transform ${expandedSection === 'layers' ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
        {expandedSection === 'layers' && (
          <div className="space-y-1 pl-2">
            <CheckboxItem label="头皮" checked={showScalp} onChangeKey="showScalp" />
            <CheckboxItem label="颅骨" checked={showSkull} onChangeKey="showSkull" />
            <CheckboxItem label="大脑皮层" checked={showBrain} onChangeKey="showBrain" />
            <CheckboxItem label="电极" checked={showElectrodes} onChangeKey="showElectrodes" />
            <CheckboxItem label="偶极子" checked={showDipole} onChangeKey="showDipole" />
            <CheckboxItem label="置信椭球" checked={showConfidenceEllipsoid} onChangeKey="showConfidenceEllipsoid" />
            <CheckboxItem label="TMS线圈" checked={showCoil} onChangeKey="showCoil" />
            <CheckboxItem label="电流密度" checked={showCurrentDensity} onChangeKey="showCurrentDensity" />
          </div>
        )}
      </div>

      <div className="border-t border-slate-700 pt-3">
        <button
          onClick={() => toggleSection('wireframe')}
          className="w-full flex items-center justify-between py-2 text-slate-200 font-medium hover:text-white"
        >
          <span>线框模式</span>
          <span className={`transition-transform ${expandedSection === 'wireframe' ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
        {expandedSection === 'wireframe' && (
          <div className="space-y-1 pl-2">
            <CheckboxItem label="头皮线框" checked={wireframeScalp} onChangeKey="wireframeScalp" />
            <CheckboxItem label="颅骨线框" checked={wireframeSkull} onChangeKey="wireframeSkull" />
            <CheckboxItem label="脑层线框" checked={wireframeBrain} onChangeKey="wireframeBrain" />
          </div>
        )}
      </div>

      <div className="border-t border-slate-700 pt-3">
        <button
          onClick={() => toggleSection('opacity')}
          className="w-full flex items-center justify-between py-2 text-slate-200 font-medium hover:text-white"
        >
          <span>透明度调节</span>
          <span className={`transition-transform ${expandedSection === 'opacity' ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
        {expandedSection === 'opacity' && (
          <div className="space-y-2 pl-2">
            <SliderItem label="头皮透明度" value={scalpOpacity} onChangeKey="scalpOpacity" />
            <SliderItem label="颅骨透明度" value={skullOpacity} onChangeKey="skullOpacity" />
            <SliderItem label="脑皮层透明度" value={brainOpacity} onChangeKey="brainOpacity" />
          </div>
        )}
      </div>

      {maxTimeWindows > 1 && (
        <div className="border-t border-slate-700 pt-3">
          <button
            onClick={() => toggleSection('timewindow')}
            className="w-full flex items-center justify-between py-2 text-slate-200 font-medium hover:text-white"
          >
            <span>时间窗口</span>
            <span className={`transition-transform ${expandedSection === 'timewindow' ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
          {expandedSection === 'timewindow' && (
            <div className="pl-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">当前窗口</span>
                <span className="text-slate-300">
                  {timeWindowIndex + 1} / {maxTimeWindows}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={maxTimeWindows - 1}
                step={1}
                value={timeWindowIndex}
                onChange={(e) => onChange('timeWindowIndex', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
