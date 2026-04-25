import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, SkipForward, Timer } from 'lucide-react';
import { Card3D } from '@/components/ui/Card3D';

type Mode = 'work' | 'short' | 'long';
const DURATIONS: Record<Mode, number> = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
const LABELS: Record<Mode, string> = { work: 'Focus', short: 'Short Break', long: 'Long Break' };
const COLORS: Record<Mode, string> = { work: '#7c3aed', short: '#0891b2', long: '#f97316' };
const GLOWS: Record<Mode, string>  = { work: 'rgba(124,58,237,0.5)', short: 'rgba(8,145,178,0.5)', long: 'rgba(249,115,22,0.5)' };

const SIZE = 220;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function PomodoroPage() {
  const [mode, setMode] = useState<Mode>('work');
  const [remaining, setRemaining] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState<{ mode: Mode; at: string }[]>([]);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = DURATIONS[mode];
  const progress = (total - remaining) / total;
  const dash = C * (1 - progress);
  const color = COLORS[mode];
  const glow = GLOWS[mode];

  const finish = useCallback(() => {
    setRunning(false);
    setSessions(s => [...s, { mode, at: new Date().toLocaleTimeString() }]);
    if (mode === 'work') {
      setCycles(c => {
        const next = c + 1;
        if (next % 4 === 0) { setMode('long'); setRemaining(DURATIONS.long); }
        else { setMode('short'); setRemaining(DURATIONS.short); }
        return next;
      });
    } else {
      setMode('work'); setRemaining(DURATIONS.work);
    }
  }, [mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(intervalRef.current!); finish(); return 0; }
          return r - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, finish]);

  function switchMode(m: Mode) { setMode(m); setRemaining(DURATIONS[m]); setRunning(false); }
  function reset() { setRemaining(DURATIONS[mode]); setRunning(false); }

  const workSessions  = sessions.filter(s => s.mode === 'work').length;
  const breakSessions = sessions.filter(s => s.mode !== 'work').length;

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${glow.replace('0.5','0.2')}`, border: `1px solid ${glow.replace('0.5','0.4')}`, transition: 'all 0.4s ease' }}>
          <Timer size={15} style={{ color }} />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Pomodoro Timer</h1>
          <p className="text-xs text-slate-600">Deep work cycles — stay in the zone</p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {(['work', 'short', 'long'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="flex-1 py-2.5 text-xs font-semibold tracking-wide transition-all duration-300"
            style={{
              background: mode === m ? `${COLORS[m]}22` : 'rgba(255,255,255,0.02)',
              color: mode === m ? COLORS[m] : '#475569',
              borderRight: m !== 'long' ? '1px solid rgba(255,255,255,0.06)' : 'none',
              boxShadow: mode === m ? `inset 0 -2px 0 ${COLORS[m]}` : 'none',
            }}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <Card3D className="p-8 flex flex-col items-center" intensity={5}>
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="-rotate-90" style={{ overflow: 'visible' }}>
            {/* Track */}
            <circle cx={SIZE/2} cy={SIZE/2} r={R}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />
            {/* Glow ring */}
            <circle cx={SIZE/2} cy={SIZE/2} r={R}
              fill="none" stroke={color} strokeWidth={STROKE + 4}
              strokeDasharray={C} strokeDashoffset={dash} strokeLinecap="round"
              style={{ opacity: 0.15, transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease', filter: `blur(6px)` }}
            />
            {/* Progress ring */}
            <circle cx={SIZE/2} cy={SIZE/2} r={R}
              fill="none" stroke={color} strokeWidth={STROKE}
              strokeDasharray={C} strokeDashoffset={dash} strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease',
                filter: `drop-shadow(0 0 8px ${color})`,
              }}
            />
          </svg>

          {/* Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-mono font-black tabular-nums leading-none transition-all duration-400"
              style={{ fontSize: 52, color, textShadow: `0 0 30px ${glow}` }}
            >
              {fmt(remaining)}
            </span>
            <span className="text-xs font-semibold mt-2 tracking-wider transition-all duration-400" style={{ color }}>
              {LABELS[mode]}
            </span>
            {running && (
              <span
                className="text-[9px] font-mono tracking-widest mt-1.5 px-2 py-0.5 rounded-full"
                style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
              >
                RUNNING
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-6">
          <button onClick={reset}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RotateCcw size={14} />
          </button>

          <button
            onClick={() => setRunning(r => !r)}
            className="px-10 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}bb)`,
              boxShadow: `0 0 24px ${glow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
              transition: 'all 0.3s ease',
            }}
          >
            {running ? '⏸ Pause' : '▶ Start'}
          </button>

          <button onClick={finish}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <SkipForward size={14} />
          </button>
        </div>
      </Card3D>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Cycles', value: cycles, color: '#7c3aed', glow: 'rgba(124,58,237,0.4)' },
          { label: 'Work sessions', value: workSessions, color: '#0891b2', glow: 'rgba(8,145,178,0.4)' },
          { label: 'Breaks', value: breakSessions, color: '#f97316', glow: 'rgba(249,115,22,0.4)' },
        ].map(({ label, value, color: c, glow: g }) => (
          <Card3D key={label} className="p-4 text-center" intensity={7}>
            <p className="text-3xl font-mono font-black" style={{ color: c, textShadow: `0 0 16px ${g}` }}>
              {value}
            </p>
            <p className="text-[10px] text-slate-600 mt-1">{label}</p>
          </Card3D>
        ))}
      </div>

      {/* Session log */}
      {sessions.length > 0 && (
        <div className="gcard p-4">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">Session log</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {[...sessions].reverse().map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: COLORS[s.mode], boxShadow: `0 0 4px ${COLORS[s.mode]}` }} />
                <span className="text-slate-400">{LABELS[s.mode]}</span>
                <span className="ml-auto text-slate-700">{s.at}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <div
        className="rounded-xl px-4 py-3 text-xs text-slate-500 leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-nebula-400 font-semibold">Pomodoro technique — </span>
        25 min focus → 5 min break → repeat 4× → 15 min long break.
        Use breaks to review fading memories in your Dory library.
      </div>
    </div>
  );
}
