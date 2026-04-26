import { useState, useEffect } from 'react';
import { getFading } from '@/lib/api';
import type { BackendChunk } from '@/lib/types';
import { ChevronLeft, ChevronRight, CalendarDays, Brain, X, BookOpen, AlertTriangle } from 'lucide-react';
import { Card3D } from '@/components/ui/Card3D';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// Solve Ebbinghaus decay for when R drops to 0.2 (critical).
// R(t) = exp(-t / SK)  →  SK = -elapsed / ln(R_now)
// forget_hours = ln(5) * SK
function predictForgetDate(chunk: BackendChunk): Date {
  const now = Date.now();
  const lastMs = new Date(chunk.last_accessed).getTime();
  const elapsedHours = Math.max((now - lastMs) / 3_600_000, 0.01);
  const R = Math.max(Math.min(chunk.retention, 0.9999), 0.0001);
  const SK = elapsedHours / -Math.log(R);
  const forgetHours = Math.log(5) * SK; // ln(5) ≈ 1.609
  return new Date(lastMs + forgetHours * 3_600_000);
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function urgencyColor(daysUntil: number) {
  if (daysUntil < 0)  return '#ef4444'; // already forgotten
  if (daysUntil < 2)  return '#f97316'; // today / tomorrow
  if (daysUntil < 7)  return '#eab308'; // this week
  if (daysUntil < 30) return '#22c55e'; // this month
  return '#0891b2'; // far future
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n) + '…';
}

export function CalendarPage() {
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [chunks, setChunks]   = useState<BackendChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChunk, setOpenChunk] = useState<BackendChunk | null>(null);

  useEffect(() => {
    getFading(500)
      .then(r => setChunks(r.chunks))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build forget-date → chunks map
  const forgetMap: Record<string, BackendChunk[]> = {};
  for (const c of chunks) {
    const fd = predictForgetDate(c);
    const k  = dateKey(fd);
    if (!forgetMap[k]) forgetMap[k] = [];
    forgetMap[k].push(c);
  }

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfWeek(year, month);
  const todayKey    = dateKey(now);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedChunks = selected ? (forgetMap[selected] ?? []) : [];

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Forget Calendar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Dates when each concept crosses the critical retention threshold — click a day to review
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { label: 'Overdue', color: '#ef4444' },
          { label: 'Today / Tomorrow', color: '#f97316' },
          { label: 'This week', color: '#eab308' },
          { label: 'This month', color: '#22c55e' },
          { label: 'Later', color: '#0891b2' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-[10px] font-mono text-slate-500">{label}</span>
          </div>
        ))}
        {loading && <span className="text-[10px] font-mono text-slate-600 ml-auto">Loading chunks…</span>}
      </div>

      <Card3D className="p-5" intensity={4}>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prev} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ChevronLeft size={15} />
          </button>
          <div className="text-center">
            <p className="text-lg font-black text-white tracking-tight">
              <span className="text-gradient-nebula">{MONTHS[month]}</span>
            </p>
            <p className="text-xs font-mono text-slate-600">{year}</p>
          </div>
          <button onClick={next} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-mono text-slate-700 uppercase tracking-widest py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const k       = `${year}-${month}-${day}`;
            const isToday = k === todayKey;
            const isSel   = k === selected;
            const dayChunks = forgetMap[k] ?? [];
            const hasForgetting = dayChunks.length > 0;

            // Pick dominant color based on most urgent chunk
            const today0 = new Date(year, month, day);
            const daysUntil = Math.floor((today0.getTime() - now.getTime()) / 86_400_000);
            const dotColor = hasForgetting ? urgencyColor(daysUntil) : null;

            return (
              <button
                key={day}
                onClick={() => setSelected(isSel ? null : k)}
                className="relative flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-150"
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
                    : hasForgetting
                    ? `1px solid ${dotColor}40`
                    : '1px solid rgba(255,255,255,0.04)',
                  boxShadow: isSel ? '0 0 16px rgba(124,58,237,0.25)' : hasForgetting ? `0 0 8px ${dotColor}30` : 'none',
                }}
              >
                <span className="text-sm font-mono font-bold" style={{ color: isSel ? '#fff' : isToday ? '#a78bfa' : '#94a3b8' }}>
                  {day}
                </span>
                {hasForgetting && (
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: Math.min(dayChunks.length, 3) }).map((_, j) => (
                      <span key={j} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: dotColor!, boxShadow: `0 0 4px ${dotColor}` }} />
                    ))}
                    {dayChunks.length > 3 && (
                      <span className="text-[8px] font-mono" style={{ color: dotColor! }}>+{dayChunks.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card3D>

      {/* Selected day panel */}
      {selected && (
        <Card3D className="p-5" intensity={4}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-nebula-400" />
              <h3 className="font-bold text-white text-sm">
                {MONTHS[month]} {parseInt(selected.split('-')[2])}, {year}
              </h3>
              {selectedChunks.length > 0 && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  {selectedChunks.length} concept{selectedChunks.length !== 1 ? 's' : ''} will be forgotten
                </span>
              )}
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-slate-300 transition-colors">
              <X size={14} />
            </button>
          </div>

          {selectedChunks.length === 0 ? (
            <div className="flex items-center justify-center gap-2 h-12 text-slate-600">
              <BookOpen size={14} />
              <p className="text-sm font-mono">No concepts forgetting on this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedChunks.map((c) => {
                const today0  = new Date(parseInt(selected.split('-')[0]), parseInt(selected.split('-')[1]), parseInt(selected.split('-')[2]));
                const daysUntil = Math.floor((today0.getTime() - now.getTime()) / 86_400_000);
                const color   = urgencyColor(daysUntil);
                return (
                  <button
                    key={c.chunk_id}
                    onClick={() => setOpenChunk(c)}
                    className="w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150 hover:scale-[1.01]"
                    style={{
                      background: `${color}08`,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {truncate(c.content, 120)}
                      </p>
                      <p className="text-[10px] font-mono text-slate-600 mt-1">
                        {c.source_file} · {Math.round(c.retention * 100)}% retention now
                      </p>
                    </div>
                    <span className="text-[10px] font-mono shrink-0 mt-0.5" style={{ color }}>
                      Review →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card3D>
      )}

      {/* Chunk detail drawer */}
      {openChunk && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpenChunk(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl p-6 space-y-4"
            style={{
              background: 'linear-gradient(135deg, rgba(15,10,30,0.98) 0%, rgba(5,8,16,0.99) 100%)',
              border: '1px solid rgba(124,58,237,0.3)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-nebula-400" />
                <span className="text-xs font-mono text-slate-400">{openChunk.source_file}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  {Math.round(openChunk.retention * 100)}% retained
                </span>
                <button onClick={() => setOpenChunk(null)} className="text-slate-600 hover:text-white transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="rounded-xl p-4 text-sm text-slate-300 leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {openChunk.content}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
              <span>Accessed {openChunk.access_count} time{openChunk.access_count !== 1 ? 's' : ''}</span>
              <span>Will be forgotten: {predictForgetDate(openChunk).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Forgetting this month',
            value: Object.entries(forgetMap).filter(([k]) => {
              const [y, m] = k.split('-').map(Number);
              return y === year && m === month;
            }).reduce((sum, [, arr]) => sum + arr.length, 0),
            color: '#f97316',
          },
          {
            label: 'Forgetting today',
            value: (forgetMap[todayKey] ?? []).length,
            color: '#ef4444',
          },
          {
            label: 'Safe this month',
            value: chunks.filter(c => {
              const fd = predictForgetDate(c);
              return fd.getFullYear() !== year || fd.getMonth() !== month;
            }).length,
            color: '#22c55e',
          },
        ].map(({ label, value, color }) => (
          <Card3D key={label} className="p-4 text-center" intensity={6}>
            <p className="text-2xl font-mono font-black" style={{ color }}>{value}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
