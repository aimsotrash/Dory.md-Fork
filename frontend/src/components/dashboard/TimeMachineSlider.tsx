import { useState, useCallback, useRef, useEffect } from 'react';
import { Clock, Rewind, FastForward, Orbit } from 'lucide-react';
import { formatHours, debounce } from '@/lib/utils';

interface TimeMachineSliderProps {
  value: number;
  onChange: (hours: number) => void;
  max?: number;
}

const MARKS = [0, 24, 168, 720, 2160, 4320];
const MARK_LABELS: Record<number, string> = {
  0: 'Now',
  24: '1d',
  168: '1w',
  720: '1mo',
  2160: '3mo',
  4320: '6mo',
};

export function TimeMachineSlider({
  value,
  onChange,
  max = 4320,
}: TimeMachineSliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const debouncedOnChange = useRef(debounce(onChange, 400));

  useEffect(() => {
    debouncedOnChange.current = debounce(onChange, 400);
  }, [onChange]);

  const handleChange = useCallback(
    (hours: number) => {
      const clamped = Math.max(0, Math.min(max, hours));
      setLocalValue(clamped);
      debouncedOnChange.current(clamped);
    },
    [max]
  );

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const pct = (localValue / max) * 100;
  const isNow = localValue === 0;

  const gradientColor = isNow
    ? '#7c3aed'
    : localValue < 720
    ? '#0891b2'
    : localValue < 2160
    ? '#f97316'
    : '#dc2626';

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              background: `${gradientColor}20`,
              border: `1px solid ${gradientColor}50`,
            }}
          >
            <Orbit size={14} style={{ color: gradientColor }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Time Machine</h2>
            <p className="text-xs text-slate-500">Project memory decay into the future</p>
          </div>
        </div>

        <div className="text-right">
          <div
            className="text-xl font-mono font-bold transition-all duration-300"
            style={{ color: gradientColor }}
          >
            {formatHours(localValue)}
          </div>
          {!isNow && (
            <p className="text-[10px] text-slate-500">from now</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative flex items-center gap-2">
          <button
            className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-cosmos-800 transition-all shrink-0"
            onClick={() => handleChange(Math.max(0, localValue - 24))}
            disabled={localValue === 0}
          >
            <Rewind size={13} />
          </button>

          <div className="relative flex-1">
            <div className="relative h-2 rounded-full bg-cosmos-700 overflow-visible">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-200"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, #7c3aed 0%, ${gradientColor} 100%)`,
                  boxShadow: `0 0 8px ${gradientColor}60`,
                }}
              />
              {MARKS.map((mark) => {
                const markPct = (mark / max) * 100;
                return (
                  <div
                    key={mark}
                    className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full transition-all duration-200"
                    style={{
                      left: `${markPct}%`,
                      transform: 'translate(-50%, -50%)',
                      background: mark <= localValue ? gradientColor : 'rgba(148,163,184,0.3)',
                    }}
                  />
                );
              })}
            </div>
            <input
              type="range"
              min={0}
              max={max}
              step={1}
              value={localValue}
              onChange={(e) => handleChange(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
              style={{ margin: 0 }}
            />
          </div>

          <button
            className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-cosmos-800 transition-all shrink-0"
            onClick={() => handleChange(Math.min(max, localValue + 24))}
            disabled={localValue === max}
          >
            <FastForward size={13} />
          </button>
        </div>

        <div className="flex justify-between px-6">
          {MARKS.map((mark) => (
            <button
              key={mark}
              onClick={() => handleChange(mark)}
              className={`text-[10px] font-mono transition-all duration-200 hover:text-slate-300 ${
                Math.abs(localValue - mark) < 24
                  ? 'font-semibold'
                  : 'text-slate-600'
              }`}
              style={
                Math.abs(localValue - mark) < 24
                  ? { color: gradientColor }
                  : {}
              }
            >
              {MARK_LABELS[mark]}
            </button>
          ))}
        </div>
      </div>

      {!isNow && (
        <div className="flex items-center justify-between pt-1 border-t border-cosmos-700/40">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={11} />
            <span>Simulating decay at t = {localValue}h</span>
          </div>
          <button
            onClick={() => handleChange(0)}
            className="text-xs text-nebula-400 hover:text-nebula-300 font-medium transition-colors"
          >
            Reset to now
          </button>
        </div>
      )}
    </div>
  );
}
