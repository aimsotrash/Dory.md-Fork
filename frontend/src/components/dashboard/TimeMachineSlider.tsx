import { useState, useCallback, useRef, useEffect } from 'react';
import { Orbit, Rewind, FastForward, RotateCcw } from 'lucide-react';
import { formatHours, debounce } from '@/lib/utils';
import { Card3D } from '@/components/ui/Card3D';

interface TimeMachineSliderProps {
  value: number;
  onChange: (hours: number) => void;
  max?: number;
}

const MARKS = [
  { h: 0, label: 'Now' },
  { h: 24, label: '1d' },
  { h: 168, label: '1w' },
  { h: 720, label: '1mo' },
  { h: 2160, label: '3mo' },
  { h: 4320, label: '6mo' },
];

export function TimeMachineSlider({ value, onChange, max = 4320 }: TimeMachineSliderProps) {
  const [local, setLocal] = useState(value);
  const debouncedOnChange = useRef(debounce(onChange, 400));

  useEffect(() => { debouncedOnChange.current = debounce(onChange, 400); }, [onChange]);
  useEffect(() => { setLocal(value); }, [value]);

  const set = useCallback((h: number) => {
    const v = Math.max(0, Math.min(max, h));
    setLocal(v);
    debouncedOnChange.current(v);
  }, [max]);

  const pct = (local / max) * 100;
  const isNow = local === 0;

  const gradColor =
    isNow ? '#7c3aed' :
    local < 720 ? '#0891b2' :
    local < 2160 ? '#f97316' : '#dc2626';

  return (
    <Card3D className="p-5" intensity={6}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
            style={{
              background: `${gradColor}20`,
              border: `1px solid ${gradColor}50`,
              boxShadow: `0 0 16px ${gradColor}30`,
            }}
          >
            <Orbit size={15} style={{ color: gradColor }} className="animate-spin-slow" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Time Machine</p>
            <p className="text-[10px] text-slate-600">Project memory decay</p>
          </div>
        </div>

        <div className="text-right">
          <div
            className="text-2xl font-mono font-black tracking-tight transition-all duration-300"
            style={{ color: gradColor, textShadow: `0 0 20px ${gradColor}60` }}
          >
            {formatHours(local)}
          </div>
          {!isNow && <p className="text-[10px] text-slate-600 mt-0.5">from now</p>}
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => set(Math.max(0, local - 24))}
            disabled={local === 0}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 disabled:opacity-30 transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Rewind size={12} />
          </button>

          <div className="relative flex-1">
            {/* Custom track */}
            <div className="relative h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {/* Fill */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, #7c3aed, ${gradColor})`,
                  boxShadow: `0 0 10px ${gradColor}80`,
                }}
              />
              {/* Mark dots */}
              {MARKS.map(({ h }) => (
                <div
                  key={h}
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    left: `${(h / max) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    background: h <= local ? gradColor : 'rgba(255,255,255,0.15)',
                    boxShadow: h <= local ? `0 0 6px ${gradColor}` : 'none',
                    zIndex: 1,
                  }}
                />
              ))}
            </div>

            {/* Native input overlaid */}
            <input
              type="range"
              min={0} max={max} step={1} value={local}
              onChange={(e) => set(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              style={{ height: '8px', margin: 0, zIndex: 2 }}
            />
          </div>

          <button
            onClick={() => set(Math.min(max, local + 24))}
            disabled={local === max}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 disabled:opacity-30 transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <FastForward size={12} />
          </button>
        </div>

        {/* Mark labels */}
        <div className="flex justify-between px-6">
          {MARKS.map(({ h, label }) => (
            <button
              key={h}
              onClick={() => set(h)}
              className="text-[9px] font-mono transition-all duration-200 hover:scale-110"
              style={{
                color: Math.abs(local - h) < 24 ? gradColor : 'rgba(100,116,139,0.6)',
                fontWeight: Math.abs(local - h) < 24 ? 700 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      {!isNow && (
        <div
          className="flex items-center justify-between mt-4 pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-[10px] text-slate-600 font-mono">t = {local}h</span>
          <button
            onClick={() => set(0)}
            className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
            style={{ color: gradColor }}
          >
            <RotateCcw size={10} /> Reset
          </button>
        </div>
      )}
    </Card3D>
  );
}
