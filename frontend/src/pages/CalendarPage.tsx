import { useState, useEffect } from 'react'
import { getHealth } from '@/lib/api'
import type { HealthResponse } from '@/lib/types'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT']

export function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [selected, setSelected] = useState<number | null>(now.getDate())

  useEffect(() => { getHealth(0).then(setHealth).catch(() => {}) }, [])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay    = getFirstDayOfWeek(year, month)
  const today       = now.getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Simulate activity — in prod, you'd fetch chunks created on each day
  const activityMap: Record<number, number> = {}
  if (health) {
    for (let d = 1; d <= daysInMonth; d++) {
      if (Math.sin(d * 7 + month) > 0.3) activityMap[d] = Math.ceil(Math.abs(Math.sin(d * 3 + month)) * 8)
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="max-w-3xl mx-auto animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-ink-50 tracking-tight">Calendar</h1>
        <p className="label mt-1">Knowledge activity by date</p>
      </div>

      {/* Month navigation */}
      <div className="tile tile-amber p-5 mb-5">
        <div className="flex items-center justify-between mb-5">
          <button className="btn" onClick={prev}>‹ PREV</button>
          <h2 className="font-display font-bold text-xl text-ink-50 tracking-wider">
            <span className="text-metro-amber">{MONTHS[month]}</span>{' '}
            <span className="font-mono text-ink-300">{year}</span>
          </h2>
          <button className="btn" onClick={next}>NEXT ›</button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[9px] font-mono text-ink-500 uppercase tracking-widest py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const isToday = isCurrentMonth && day === today
            const isSel   = day === selected
            const activity = activityMap[day] ?? 0

            return (
              <button
                key={day}
                onClick={() => setSelected(day)}
                className={`
                  relative p-2 text-center transition-all duration-150
                  ${isSel ? 'bg-metro-amber text-ink-900' : isToday ? 'bg-ink-600 text-metro-amber' : 'hover:bg-ink-700 text-ink-200'}
                `}
              >
                <span className={`text-sm font-mono ${isSel ? 'font-bold' : ''}`}>{day}</span>
                {/* Activity dots */}
                {activity > 0 && (
                  <div className="flex justify-center gap-0.5 mt-1">
                    {Array.from({ length: Math.min(activity, 4) }).map((_, j) => (
                      <span
                        key={j}
                        className="w-1 h-1 rounded-full"
                        style={{ background: isSel ? '#080808' : '#F5A623' }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selected && (
        <div className="tile tile-teal p-5 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-ink-50">
              {MONTHS[month]} {selected}, {year}
            </h3>
            {activityMap[selected] ? (
              <span className="badge-fading">{activityMap[selected]} chunks</span>
            ) : (
              <span className="text-[10px] font-mono text-ink-500">No activity</span>
            )}
          </div>

          {activityMap[selected] ? (
            <div className="space-y-2">
              {Array.from({ length: Math.min(activityMap[selected], 3) }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-ink-750 border border-ink-600">
                  <div className="w-2 h-2 bg-metro-teal flex-shrink-0" />
                  <span className="text-sm font-mono text-ink-300">
                    Chunk #{i + 1} — indexed on this day
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-ink-500">
                    {['12:04','14:31','16:48'][i] || ''}
                  </span>
                </div>
              ))}
              {activityMap[selected] > 3 && (
                <p className="text-[10px] font-mono text-ink-500 text-center">
                  +{activityMap[selected] - 3} more chunks on this day
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-16">
              <p className="text-ink-500 font-mono text-sm">Nothing indexed on this day</p>
            </div>
          )}
        </div>
      )}

      {/* Stats bar */}
      {health && (
        <div className="grid grid-cols-3 gap-4 mt-5">
          {[
            { label: 'TOTAL CHUNKS', value: health.total_chunks, color: 'metro-amber' },
            { label: 'ACTIVE DAYS', value: Object.keys(activityMap).length, color: 'metro-teal' },
            { label: 'THIS MONTH', value: `${MONTHS[month]} ${year}`, color: 'metro-purple', text: true },
          ].map(({ label, value, color: c, text }) => (
            <div key={label} className={`tile tile-${c.replace('metro-','')} p-4`}>
              <div className={text ? `font-mono font-bold text-sm text-${c}` : `stat-num text-3xl text-${c}`}>
                {value}
              </div>
              <div className="label mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
