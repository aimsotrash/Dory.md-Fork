import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, SkipForward, Timer, TrendingUp, Flame, Clock } from 'lucide-react';
import { Card3D } from '@/components/ui/Card3D';

type Mode = 'work' | 'short' | 'long';
const DURATIONS: Record<Mode, number> = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
const LABELS:    Record<Mode, string>  = { work: 'Focus', short: 'Short Break', long: 'Long Break' };
const COLORS:    Record<Mode, string>  = { work: '#7c3aed', short: '#0891b2', long: '#f97316' };
const GLOWS:     Record<Mode, string>  = { work: 'rgba(124,58,237,0.5)', short: 'rgba(8,145,178,0.5)', long: 'rgba(249,115,22,0.5)' };
const WORK_MIN = 25;

const SIZE = 220;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

const STORAGE_KEY = 'dory_pomodoro_v1';

interface StoredSession {
  mode: Mode;
  at: string;   // ISO timestamp
  date: string; // YYYY-MM-DD
}

interface PomodoroStore {
  sessions: StoredSession[];
  totalCycles: number;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadStore(): PomodoroStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PomodoroStore;
  } catch { /* ignore */ }
  return { sessions: [], totalCycles: 0 };
}

function saveStore(store: PomodoroStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Returns array of last N days (YYYY-MM-DD), most recent last
function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return days;
}

export function PomodoroPage() {
  const [mode, setMode]           = useState<Mode>('work');
  const [remaining, setRemaining] = useState(DURATIONS.work);
  const [running, setRunning]     = useState(false);
  const [store, setStore]         = useState<PomodoroStore>(loadStore);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total    = DURATIONS[mode];
  const progress = (total - remaining) / total;
  const dash     = C * (1 - progress);
  const color    = COLORS[mode];
  const glow     = GLOWS[mode];

  // Derived stats
  const today           = todayKey();
  const todaySessions   = store.sessions.filter(s => s.date === today);
  const todayWorkMin    = todaySessions.filter(s => s.mode === 'work').length * WORK_MIN;
  const allWorkSessions = store.sessions.filter(s => s.mode === 'work').length;
  const allBreaks       = store.sessions.filter(s => s.mode !== 'work').length;
  const allFocusHours   = Math.floor((allWorkSessions * WORK_MIN) / 60);
  const allFocusMinRem  = (allWorkSessions * WORK_MIN) % 60;

  // Weekly bar chart data (work sessions per day for last 7 days)
  const weekDays  = lastNDays(7);
  const weekCounts = weekDays.map(d => store.sessions.filter(s => s.date === d && s.mode === 'work').length);
  const weekMax   = Math.max(...weekCounts, 1);

  const finish = useCallback(() => {
    setRunning(false);
    const entry: StoredSession = {
      mode,
      at: new Date().toISOString(),
      date: todayKey(),
    };
    setStore(prev => {
      const next: PomodoroStore = {
        sessions: [...prev.sessions, entry],
        totalCycles: mode === 'work' ? prev.totalCycles + 1 : prev.totalCycles,
      };
      saveStore(next);
      return next;
    });
    if (mode === 'work') {
      setStore(prev => {
        const nextCycles = prev.totalCycles; // already incremented above
        const isLong = nextCycles % 4 === 0 && nextCycles > 0;
        const nextMode: Mode = isLong ? 'long' : 'short';
        setMode(nextMode);
        setRemaining(DURATIONS[nextMode]);
        return prev;
      });
    } else {
      setMode('work');
      setRemaining(DURATIONS.work);
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

  // Day abbreviations for weekly chart
  const dayLabels = weekDays.map(d => {
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString([], { weekday: 'short' }).slice(0, 2);
  });

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
        {todayWorkMin > 0 && (
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
            <Flame size={11} className="text-nebula-400" />
            <span className="text-[11px] font-mono font-bold text-nebula-300">{todayWorkMin}m today</span>
          </div>
        )}
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
            <circle cx={SIZE/2} cy={SIZE/2} r={R}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />
            <circle cx={SIZE/2} cy={SIZE/2} r={R}
              fill="none" stroke={color} strokeWidth={STROKE + 4}
              strokeDasharray={C} strokeDashoffset={dash} strokeLinecap="round"
              style={{ opacity: 0.15, transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease', filter: `blur(6px)` }} />
            <circle cx={SIZE/2} cy={SIZE/2} r={R}
              fill="none" stroke={color} strokeWidth={STROKE}
              strokeDasharray={C} strokeDashoffset={dash} strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease', filter: `drop-shadow(0 0 8px ${color})` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono font-black tabular-nums leading-none"
              style={{ fontSize: 52, color, textShadow: `0 0 30px ${glow}` }}>
              {fmt(remaining)}
            </span>
            <span className="text-xs font-semibold mt-2 tracking-wider" style={{ color }}>{LABELS[mode]}</span>
            {running && (
              <span className="text-[9px] font-mono tracking-widest mt-1.5 px-2 py-0.5 rounded-full"
                style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
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
          <button onClick={() => setRunning(r => !r)}
            className="px-10 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: `0 0 24px ${glow}, inset 0 1px 0 rgba(255,255,255,0.15)` }}>
            {running ? '⏸ Pause' : '▶ Start'}
          </button>
          <button onClick={finish}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <SkipForward size={14} />
          </button>
        </div>
      </Card3D>

      {/* Live stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total cycles', value: store.totalCycles, color: '#7c3aed', glow: 'rgba(124,58,237,0.4)', icon: <Flame size={12} /> },
          { label: 'Work sessions', value: allWorkSessions, color: '#0891b2', glow: 'rgba(8,145,178,0.4)', icon: <TrendingUp size={12} /> },
          { label: 'Breaks taken', value: allBreaks, color: '#f97316', glow: 'rgba(249,115,22,0.4)', icon: <Clock size={12} /> },
        ].map(({ label, value, color: c, glow: g, icon }) => (
          <Card3D key={label} className="p-4 text-center" intensity={7}>
            <div className="flex justify-center mb-1" style={{ color: c }}>{icon}</div>
            <p className="text-3xl font-mono font-black" style={{ color: c, textShadow: `0 0 16px ${g}` }}>{value}</p>
            <p className="text-[10px] text-slate-600 mt-1">{label}</p>
          </Card3D>
        ))}
      </div>

      {/* All-time focus + weekly chart */}
      <Card3D className="p-5" intensity={4}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-0.5">All-time focus</p>
            <p className="text-2xl font-black text-white">
              {allFocusHours > 0 ? (
                <><span style={{ color: '#7c3aed' }}>{allFocusHours}h </span><span className="text-lg">{allFocusMinRem}m</span></>
              ) : (
                <span style={{ color: '#7c3aed' }}>{allWorkSessions * WORK_MIN}m</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-0.5">Today</p>
            <p className="text-2xl font-black" style={{ color: '#0891b2' }}>{todayWorkMin}m</p>
          </div>
        </div>

        {/* 7-day bar chart */}
        <div>
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">This week — work sessions</p>
          <div className="flex items-end gap-1.5 h-14">
            {weekCounts.map((count, i) => {
              const isToday = weekDays[i] === today;
              const barH = count === 0 ? 4 : Math.max(8, Math.round((count / weekMax) * 52));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm transition-all duration-500 relative group"
                    style={{
                      height: barH,
                      background: isToday
                        ? 'linear-gradient(180deg, #7c3aed, #0891b2)'
                        : count > 0 ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.04)',
                      boxShadow: isToday ? '0 0 8px rgba(124,58,237,0.5)' : 'none',
                    }}>
                    {count > 0 && (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-500">{count}</span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: isToday ? '#a78bfa' : '#475569' }}>{dayLabels[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card3D>

      {/* Session log (persisted, last 15) */}
      {store.sessions.length > 0 && (
        <div className="gcard p-4">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">Recent sessions</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {[...store.sessions].reverse().slice(0, 15).map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: COLORS[s.mode], boxShadow: `0 0 4px ${COLORS[s.mode]}` }} />
                <span className="text-slate-400">{LABELS[s.mode]}</span>
                <span className="ml-auto text-slate-700">{fmtTime(s.at)}</span>
                <span className="text-slate-700 w-16 text-right">{s.date === today ? 'today' : s.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="rounded-xl px-4 py-3 text-xs text-slate-500 leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-nebula-400 font-semibold">Pomodoro technique — </span>
        25 min focus → 5 min break → repeat 4× → 15 min long break.
        Use breaks to review fading memories in your Dory library.
      </div>
    </div>
  );
}
