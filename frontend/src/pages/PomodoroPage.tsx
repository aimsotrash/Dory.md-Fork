import { useState, useEffect, useRef, useCallback } from 'react'

type Mode = 'work' | 'short' | 'long'
const DURATIONS: Record<Mode, number> = { work: 25 * 60, short: 5 * 60, long: 15 * 60 }
const LABELS: Record<Mode, string> = { work: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' }
const ACCENT: Record<Mode, string> = {
  work:  '#F5A623',
  short: '#00D4AA',
  long:  '#7C3AED',
}

const SIZE = 220
const STROKE = 12
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

function fmt(s: number) {
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

export function PomodoroPage() {
  const [mode, setMode] = useState<Mode>('work')
  const [remaining, setRemaining] = useState(DURATIONS.work)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState<{ mode: Mode; at: string }[]>([])
  const [cycles, setCycles] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = DURATIONS[mode]
  const progress = (total - remaining) / total
  const dash = C * (1 - progress)
  const color = ACCENT[mode]

  const finish = useCallback(() => {
    setRunning(false)
    setSessions(s => [...s, { mode, at: new Date().toLocaleTimeString() }])
    if (mode === 'work') {
      setCycles(c => {
        const next = c + 1
        if (next % 4 === 0) { setMode('long'); setRemaining(DURATIONS.long) }
        else { setMode('short'); setRemaining(DURATIONS.short) }
        return next
      })
    } else {
      setMode('work'); setRemaining(DURATIONS.work)
    }
  }, [mode])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(intervalRef.current!); finish(); return 0 }
          return r - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, finish])

  function switchMode(m: Mode) {
    setMode(m); setRemaining(DURATIONS[m]); setRunning(false)
  }

  function reset() { setRemaining(DURATIONS[mode]); setRunning(false) }

  const workSessions = sessions.filter(s => s.mode === 'work').length
  const breakSessions = sessions.filter(s => s.mode !== 'work').length

  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-ink-50 tracking-tight">Pomodoro Timer</h1>
        <p className="label mt-1">Deep work cycles — stay in the zone</p>
      </div>

      {/* Mode selector */}
      <div className="flex border border-ink-600 mb-8">
        {(['work', 'short', 'long'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 py-2 text-xs font-mono uppercase tracking-widest transition-all ${
              mode === m ? 'text-ink-900 font-bold' : 'text-ink-400 hover:text-ink-200'
            }`}
            style={mode === m ? { background: ACCENT[m] } : {}}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          {/* Scanline overlay */}
          <div className="scanlines absolute inset-0 pointer-events-none" />

          <svg width={SIZE} height={SIZE} className="-rotate-90">
            {/* Track */}
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none" stroke="#1A1A1A" strokeWidth={STROKE}
            />
            {/* Progress */}
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeDasharray={C}
              strokeDashoffset={dash}
              strokeLinecap="square"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease', filter: `drop-shadow(0 0 8px ${color}88)` }}
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-mono font-bold tabular-nums leading-none"
              style={{ fontSize: 48, color, textShadow: `0 0 20px ${color}88` }}
            >
              {fmt(remaining)}
            </span>
            <span className="text-[10px] font-mono tracking-widest mt-1" style={{ color }}>
              {LABELS[mode]}
            </span>
            {running && (
              <span className="text-[9px] font-mono text-ink-500 mt-1 animate-pulse">RUNNING</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-6">
          <button className="btn" onClick={reset}>RESET</button>
          <button
            className="btn-primary px-8 py-3 text-base font-mono font-bold tracking-widest"
            onClick={() => setRunning(r => !r)}
          >
            {running ? '⏸ PAUSE' : '▶ START'}
          </button>
          <button className="btn" onClick={finish}>SKIP</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'CYCLES', value: cycles, color: 'metro-amber' },
          { label: 'WORK SESSIONS', value: workSessions, color: 'metro-teal' },
          { label: 'BREAKS', value: breakSessions, color: 'metro-purple' },
        ].map(({ label, value, color: c }) => (
          <div key={label} className={`tile tile-${c.replace('metro-', '')} p-4 text-center`}>
            <div className={`stat-num text-3xl text-${c}`}>{value}</div>
            <div className="label mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Session log */}
      {sessions.length > 0 && (
        <div className="tile tile-amber p-4">
          <p className="label mb-3">Session Log</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {[...sessions].reverse().map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-xs font-mono">
                <span
                  className="w-2 h-2 flex-shrink-0"
                  style={{ background: ACCENT[s.mode] }}
                />
                <span className="text-ink-300 uppercase tracking-wider">{LABELS[s.mode]}</span>
                <span className="ml-auto text-ink-500">{s.at}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technique hint */}
      <div className="mt-4 tile p-4 border-l-0 border-r-0 border-t border-b border-ink-600">
        <p className="text-[11px] font-mono text-ink-400">
          <span className="text-metro-amber font-semibold">POMODORO TECHNIQUE —</span>{' '}
          25 min focus → 5 min break → repeat 4× → 15 min long break.
          Works best when paired with reviewing fading notes during breaks.
        </p>
      </div>
    </div>
  )
}
