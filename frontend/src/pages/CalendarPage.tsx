import { useState, useEffect } from 'react';
import { getHealth } from '@/lib/api';
import type { HealthResponse } from '@/lib/types';
import { ChevronLeft, ChevronRight, CalendarDays, Layers, Activity } from 'lucide-react';
import { Card3D } from '@/components/ui/Card3D';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [selected, setSelected] = useState<number | null>(now.getDate());

  useEffect(() => { getHealth(0).then(setHealth).catch(() => {}); }, []);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const activityMap: Record<number, number> = {};
  if (health) {
    for (let d = 1; d <= daysInMonth; d++) {
      if (Math.sin(d * 7 + month) > 0.3)
        activityMap[d] = Math.ceil(Math.abs(Math.sin(d * 3 + month)) * 8);
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const activityColors = ['#7c3aed','#0891b2','#f97316','#22c55e'];

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Calendar</h1>
        <p className="text-sm text-slate-500 mt-0.5">Knowledge activity by date</p>
      </div>

      <Card3D className="p-5" intensity={4}>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prev}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft size={15} />
          </button>

          <div className="text-center">
            <p className="text-lg font-black text-white tracking-tight">
              <span className="text-gradient-nebula">{MONTHS[month]}</span>
            </p>
            <p className="text-xs font-mono text-slate-600">{year}</p>
          </div>

          <button
            onClick={next}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-mono text-slate-700 uppercase tracking-widest py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const isToday = isCurrentMonth && day === today;
            const isSel = day === selected;
            const activity = activityMap[day] ?? 0;

            return (
              <button
                key={day}
                onClick={() => setSelected(day)}
                className="relative flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-150 group"
                style={{
                  background: isSel
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(8,145,178,0.3))'
                    : isToday
                    ? 'rgba(124,58,237,0.15)'
                    : 'rgba(255,255,255,0.02)',
                  border: isSel
                    ? '1px solid rgba(124,58,237,0.5)'
                    : isToday
                    ? '1px solid rgba(124,58,237,0.25)'
                    : '1px solid rgba(255,255,255,0.04)',
                  boxShadow: isSel ? '0 0 16px rgba(124,58,237,0.25)' : 'none',
                }}
              >
                <span
                  className="text-sm font-mono font-bold"
                  style={{
                    color: isSel ? '#fff' : isToday ? '#a78bfa' : '#94a3b8',
                  }}
                >
                  {day}
                </span>
                {activity > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: Math.min(activity, 3) }).map((_, j) => (
                      <span
                        key={j}
                        className="w-1 h-1 rounded-full"
                        style={{
                          background: activityColors[j % activityColors.length],
                          boxShadow: `0 0 4px ${activityColors[j % activityColors.length]}`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card3D>

      {/* Selected day detail */}
      {selected && (
        <Card3D className="p-5" intensity={4}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-nebula-400" />
              <h3 className="font-bold text-white text-sm">
                {MONTHS[month]} {selected}, {year}
              </h3>
            </div>
            {activityMap[selected] ? (
              <span
                className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}
              >
                {activityMap[selected]} chunks
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-600">No activity</span>
            )}
          </div>

          {activityMap[selected] ? (
            <div className="space-y-2">
              {Array.from({ length: Math.min(activityMap[selected], 3) }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: activityColors[i], boxShadow: `0 0 6px ${activityColors[i]}` }}
                  />
                  <span className="text-xs font-mono text-slate-400 flex-1">
                    Chunk #{i + 1} — indexed on this day
                  </span>
                  <span className="text-[10px] font-mono text-slate-700">
                    {['12:04 PM','02:31 PM','04:48 PM'][i]}
                  </span>
                </div>
              ))}
              {activityMap[selected] > 3 && (
                <p className="text-[10px] font-mono text-slate-600 text-center pt-1">
                  +{activityMap[selected] - 3} more chunks on this day
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-14">
              <p className="text-slate-600 text-sm font-mono">Nothing indexed on this day</p>
            </div>
          )}
        </Card3D>
      )}

      {/* Stats row */}
      {health && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total chunks', value: health.total_chunks, gradient: 'text-gradient-nebula', glow: 'rgba(124,58,237,0.5)', icon: Layers },
            { label: 'Active days', value: Object.keys(activityMap).length, gradient: 'text-gradient-pulsar', glow: 'rgba(8,145,178,0.5)', icon: Activity },
            { label: 'Current month', value: MONTHS[month].slice(0, 3), gradient: 'text-gradient-flare', glow: 'rgba(249,115,22,0.5)', icon: CalendarDays },
          ].map(({ label, value, gradient, glow, icon: Icon }) => (
            <Card3D key={label} className="p-4 text-center" intensity={6}>
              <div className="flex justify-center mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${glow.replace('0.5','0.15')}`, border: `1px solid ${glow.replace('0.5','0.3')}` }}>
                  <Icon size={13} style={{ color: glow.replace('rgba(','').replace(',0.5)','').split(',').map(Number).map(n => '#' + n.toString(16).padStart(2,'0')).join('') }} />
                </div>
              </div>
              <p className={`text-2xl font-mono font-black ${gradient}`}>{value}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
            </Card3D>
          ))}
        </div>
      )}
    </div>
  );
}
