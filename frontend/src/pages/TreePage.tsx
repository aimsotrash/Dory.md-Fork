import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { KnowledgeTree } from '@/components/dashboard/KnowledgeTree';
import { getAllChunks, getStats } from '@/lib/api';
import type { BackendChunk, Category, StatsResponse } from '@/lib/types';
import type { Chunk } from '@/lib/types';
import { categoryColors } from '@/styles/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  X, ArrowRight, BrainCircuit, Sparkles, Clock, TrendingDown,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function toChunk(c: BackendChunk): Chunk {
  const cat = (c.category ?? '').toLowerCase();
  const category: Category =
    cat.includes('computer') || cat.includes('technical') || cat.includes('code') ||
    cat.includes('algorithm') || cat.includes('math') || cat.includes('data') ||
    cat.includes('design')
      ? 'technical'
      : cat.includes('personal') ? 'personal'
      : cat.includes('reference') ? 'reference'
      : 'general';
  const baseName = (c.source_file ?? '').split(/[\\/]/).pop() ?? c.chunk_id;
  return {
    id: c.chunk_id,
    content: c.content,
    source_type: 'file',
    source_name: baseName,
    category,
    created_at: c.last_accessed_iso,
    last_accessed: c.last_accessed_iso,
    access_count: c.access_count,
    stability_S: 1,
    complexity_k: 1,
    retention: c.retention,
  };
}

function leafColorNature(r: number): string {
  if (r >= 0.75) return '#22c55e';
  if (r >= 0.60) return '#86efac';
  if (r >= 0.45) return '#eab308';
  if (r >= 0.25) return '#f97316';
  return '#ef4444';
}

function retentionLabel(r: number): string {
  if (r >= 0.75) return 'Fresh';
  if (r >= 0.60) return 'Good';
  if (r >= 0.45) return 'Fading';
  if (r >= 0.25) return 'Weak';
  return 'Forgotten';
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return 'today';
  if (d === 1) return '1 day ago';
  if (d < 30) return `${d} days ago`;
  const mo = Math.floor(d / 30);
  return mo === 1 ? '1 month ago' : `${mo} months ago`;
}

const TIME_MARKS = [
  { label: 'Now',   hours: 0    },
  { label: '+7d',   hours: 168  },
  { label: '+30d',  hours: 720  },
  { label: '+90d',  hours: 2160 },
  { label: '+180d', hours: 4320 },
  { label: '+365d', hours: 8760 },
];

const LEAF_GUIDE = [
  { label: 'Fresh (Strong)',  range: '80–100%', color: '#22c55e' },
  { label: 'Good',            range: '60–79%',  color: '#86efac' },
  { label: 'Fading',         range: '30–59%',  color: '#eab308' },
  { label: 'Weak',            range: '10–29%',  color: '#f97316' },
  { label: 'Forgotten',       range: '0–9%',    color: '#ef4444' },
];

// ── mini tree SVG per category ────────────────────────────────────────────────

function MiniTree({
  avgRetention, count, label,
}: { avgRetention: number; count: number; label: string }) {
  const color = leafColorNature(avgRetention);
  const r = Math.min(8 + count * 0.18, 24);
  const pct = Math.round(avgRetention * 100);
  return (
    <div
      className="flex-1 min-w-0 rounded-xl p-2 flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-[1.04]"
      style={{ background: `${color}0c`, border: `1px solid ${color}25` }}
    >
      <svg viewBox="0 0 64 64" className="w-14 h-14">
        {/* trunk */}
        <line x1="32" y1="60" x2="32" y2="38" stroke="#3e2416" strokeWidth="4" strokeLinecap="round" />
        {/* canopy glow */}
        <circle cx="32" cy="26" r={r + 4} fill={color} opacity="0.08" />
        {/* canopy */}
        <circle cx="32" cy="26" r={r} fill={color} opacity="0.82" />
        <circle cx="32" cy="26" r={r} fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />
        {/* mini leaves cluster */}
        <circle cx={32 - r * 0.55} cy={26 - r * 0.35} r={r * 0.35} fill={color} opacity="0.6" />
        <circle cx={32 + r * 0.5}  cy={26 - r * 0.4}  r={r * 0.3}  fill={color} opacity="0.55" />
      </svg>
      <p className="text-[10px] font-semibold text-slate-300 capitalize truncate w-full text-center">{label}</p>
      <p className="text-[9px] font-mono" style={{ color }}>{pct}%</p>
    </div>
  );
}

// ── circular health gauge ─────────────────────────────────────────────────────

const GR = 54;
const GCIRC = 2 * Math.PI * GR;

function HealthGauge({ pct, color }: { pct: number; color: string }) {
  const dash = (pct / 100) * GCIRC;
  return (
    <svg width="132" height="132" viewBox="0 0 132 132">
      <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <circle
        cx="66" cy="66" r={GR} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${GCIRC}`}
        strokeDashoffset={GCIRC * 0.25}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="66" y="63" textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize="22" fontWeight="900" fontFamily="JetBrains Mono, monospace">
        {pct}%
      </text>
      <text x="66" y="82" textAnchor="middle"
        fill="rgba(148,163,184,0.55)" fontSize="8.5" fontFamily="JetBrains Mono, monospace" letterSpacing="1">
        OVERALL
      </text>
    </svg>
  );
}

// ── chunk detail modal ────────────────────────────────────────────────────────

function ChunkModal({ chunk, onClose }: { chunk: Chunk; onClose: () => void }) {
  const r     = chunk.retention ?? 0.5;
  const color = leafColorNature(r);
  const cat   = categoryColors[chunk.category] ?? '#64748b';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl p-6 space-y-4 max-h-[75vh] flex flex-col"
        style={{
          background: 'linear-gradient(135deg,rgba(12,8,28,0.99),rgba(4,2,10,0.99))',
          border: '1px solid rgba(124,58,237,0.28)',
          boxShadow: '0 40px 90px rgba(0,0,0,0.75)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
            <span className="text-xs font-mono text-slate-400">{chunk.source_name}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
              style={{ color: cat, background: `${cat}15`, border: `1px solid ${cat}30` }}>
              {chunk.category}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2 py-0.5 rounded-full"
              style={{ color, background: `${color}12`, border: `1px solid ${color}40` }}>
              {Math.round(r * 100)}% · {retentionLabel(r)}
            </span>
            <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="rounded-xl p-4 text-sm text-slate-200 leading-relaxed overflow-y-auto flex-1 whitespace-pre-wrap"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {chunk.content}
        </div>

        {/* Retention bar */}
        <div className="shrink-0">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${r * 100}%`, background: `linear-gradient(90deg, ${color}70, ${color})`, boxShadow: `0 0 8px ${color}50` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-5 text-[11px] font-mono text-slate-600 shrink-0 flex-wrap">
          <span className="flex items-center gap-1"><Clock size={10} /> {formatRelativeTime(chunk.last_accessed)}</span>
          <span className="flex items-center gap-1"><TrendingDown size={10} /> {chunk.access_count}× reviewed</span>
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export function TreePage() {
  const { user } = useAuth();
  const [chunks, setChunks]         = useState<Chunk[]>([]);
  const [stats, setStats]           = useState<StatsResponse | null>(null);
  const [timeOffset, setTimeOffset] = useState(0);
  const [selected, setSelected]     = useState<Chunk | null>(null);
  const [loading, setLoading]       = useState(true);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    Promise.all([getAllChunks(), getStats()])
      .then(([r, s]) => { setChunks(r.chunks.map(toChunk)); setStats(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Per-category stats
  const catStats = useMemo(() => {
    const map: Record<string, { total: number; sumR: number }> = {};
    chunks.forEach(c => {
      if (!map[c.category]) map[c.category] = { total: 0, sumR: 0 };
      map[c.category].total++;
      map[c.category].sumR += (c.retention ?? 0.5);
    });
    return Object.entries(map).map(([cat, { total, sumR }]) => ({
      cat,
      count: total,
      avgR: total > 0 ? sumR / total : 0,
    })).sort((a, b) => b.count - a.count);
  }, [chunks]);

  // Fading now (lowest retention)
  const fadingNow = useMemo(
    () => [...chunks].sort((a, b) => (a.retention ?? 1) - (b.retention ?? 1)).slice(0, 6),
    [chunks],
  );

  // Tree insight
  const insight = useMemo(() => {
    const mostFading = [...catStats].sort((a, b) => a.avgR - b.avgR)[0];
    return mostFading && mostFading.avgR < 0.7
      ? `You've been active across multiple topics. Consider revisiting your ${mostFading.cat} knowledge — it's fading fastest.`
      : 'Your knowledge base looks healthy. Keep reviewing regularly to maintain strong retention.';
  }, [catStats]);

  const overallPct   = stats ? Math.round(stats.avg_retention * 100) : 0;
  const gaugeColor   = leafColorNature(overallPct / 100);
  const totalLeaves  = chunks.length;
  const strongCount  = stats?.strong  ?? 0;
  const fadingCount  = stats?.fading  ?? 0;
  const weakCount    = stats?.weak    ?? 0;
  const criticalCount= stats?.critical ?? 0;

  const currentMark = TIME_MARKS.find(m => m.hours === timeOffset) ?? TIME_MARKS[0];

  return (
    <div className="flex h-[calc(100vh-49px)] overflow-hidden animate-fade-in">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <aside
        className="w-64 shrink-0 flex flex-col overflow-y-auto"
        style={{ background: 'rgba(4,2,12,0.85)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Welcome */}
        <div className="p-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
              Memory OS active
            </span>
          </div>
          <h1 className="text-base font-black text-white leading-tight">
            {greeting}, <span className="text-gradient-nebula">{firstName}!</span>
          </h1>
          <p className="text-[11px] text-slate-600 mt-0.5">Here's your knowledge tree.</p>
        </div>

        {/* Knowledge Health */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Knowledge Health
          </p>
          <div className="flex items-center gap-3">
            <HealthGauge pct={overallPct} color={gaugeColor} />
            <div className="flex-1 space-y-1.5 text-[11px] font-mono">
              {[
                { label: 'Strong',    val: strongCount,  color: '#22c55e' },
                { label: 'Fading',    val: fadingCount,  color: '#eab308' },
                { label: 'Weak',      val: weakCount,    color: '#f97316' },
                { label: 'Forgotten', val: criticalCount,color: '#ef4444' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
                  <span className="tabular-nums font-bold" style={{ color }}>{val}</span>
                  <span className="text-slate-600">{label}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-white/5">
                <span className="font-black text-white">{totalLeaves}</span>
                <span className="text-slate-600 ml-1">Total Leaves</span>
              </div>
            </div>
          </div>
        </div>

        {/* Leaf Health Guide */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Leaf Health Guide
          </p>
          <div className="space-y-1.5">
            {LEAF_GUIDE.map(({ label, range, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-1.5 h-3.5 rounded-sm shrink-0" style={{ background: color, boxShadow: `0 0 5px ${color}50` }} />
                <span className="text-[11px] text-slate-400 flex-1">{label}</span>
                <span className="text-[10px] font-mono text-slate-600">{range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge Forest */}
        <div className="p-4 flex-1">
          <p className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Knowledge Forest
          </p>
          {catStats.length === 0 ? (
            <p className="text-xs text-slate-700">No categories yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {catStats.slice(0, 6).map(({ cat, avgR, count }) => (
                <MiniTree key={cat} label={cat} avgRetention={avgR} count={count} />
              ))}
            </div>
          )}
        </div>

        {/* Dory mascot */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
              style={{ background: 'rgba(8,145,178,0.2)', border: '1px solid rgba(8,145,178,0.3)' }}>
              🐟
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400">I'm Dory!</p>
              <p className="text-[9px] text-slate-700">I find what you're forgetting.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── CENTER: TREE ────────────────────────────────────────────────────── */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="text-4xl animate-pulse">🌱</div>
              <p className="text-sm font-mono text-slate-600">Growing your knowledge tree…</p>
            </div>
          </div>
        ) : (
          <>
            <div
              className="flex-1 relative"
              style={{ background: 'radial-gradient(ellipse at 50% 30%, #0e0824, #03020a)' }}
            >
              <KnowledgeTree
                chunks={chunks}
                timeOffsetHours={timeOffset}
                onLeafClick={setSelected}
                selectedId={selected?.id}
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Time machine thumbnail strip */}
            <div
              className="shrink-0 flex items-center justify-center gap-2 px-6 py-3"
              style={{ background: 'rgba(2,1,8,0.9)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <p className="text-[10px] font-mono text-slate-700 mr-2 shrink-0">Drag the slider →</p>
              {TIME_MARKS.map(mark => (
                <button
                  key={mark.hours}
                  onClick={() => setTimeOffset(mark.hours)}
                  className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
                  style={mark.hours === timeOffset
                    ? { background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }
                  }
                >
                  <svg viewBox="0 0 28 28" className="w-7 h-7">
                    {/* Mini tree preview */}
                    <rect x={0} y={0} width={28} height={28} fill="#060410" rx={4} />
                    <line x1="14" y1="26" x2="14" y2="16" stroke="#3e2416" strokeWidth="2.5" strokeLinecap="round" />
                    {mark.hours === 0 ? (
                      <circle cx="14" cy="12" r="7" fill="#22c55e" opacity="0.8" />
                    ) : mark.hours <= 720 ? (
                      <circle cx="14" cy="12" r="7" fill="#eab308" opacity="0.7" />
                    ) : mark.hours <= 2160 ? (
                      <circle cx="14" cy="12" r="7" fill="#f97316" opacity="0.65" />
                    ) : (
                      <circle cx="14" cy="12" r="7" fill="#ef4444" opacity="0.55" />
                    )}
                  </svg>
                  <span
                    className="text-[9px] font-mono font-bold"
                    style={{ color: mark.hours === timeOffset ? '#a78bfa' : '#475569' }}
                  >
                    {mark.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────────── */}
      <aside
        className="w-56 shrink-0 flex flex-col overflow-y-auto"
        style={{ background: 'rgba(4,2,12,0.85)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Time Machine */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">⏱</span>
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Time Machine</span>
            </div>
            <span className="text-xs font-mono font-black text-nebula-400">{currentMark.label}</span>
          </div>

          {/* Slider */}
          <div className="relative py-2">
            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${(TIME_MARKS.indexOf(currentMark) / (TIME_MARKS.length - 1)) * 100}%`,
                  background: 'linear-gradient(90deg,#7c3aed,#0891b2)',
                }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {TIME_MARKS.map(m => (
                <button
                  key={m.hours}
                  onClick={() => setTimeOffset(m.hours)}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background: m.hours === timeOffset ? '#7c3aed' : 'rgba(255,255,255,0.15)',
                      boxShadow: m.hours === timeOffset ? '0 0 8px rgba(124,58,237,0.8)' : 'none',
                    }}
                  />
                  <span className="text-[7px] font-mono" style={{ color: m.hours === timeOffset ? '#a78bfa' : '#334155' }}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Fading Now */}
        <div className="p-4 flex-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <BrainCircuit size={11} className="text-flare-400" />
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Fading Now</span>
            </div>
            <Link to="/library" className="text-[9px] text-nebula-500 hover:text-nebula-300 flex items-center gap-0.5">
              View all <ArrowRight size={8} />
            </Link>
          </div>

          {fadingNow.length === 0 ? (
            <p className="text-[10px] text-slate-700 text-center py-4">All memories strong 🎉</p>
          ) : (
            <div className="space-y-2">
              {fadingNow.map(c => {
                const color = leafColorNature(c.retention ?? 0.5);
                const days  = Math.round((Date.now() - new Date(c.last_accessed).getTime()) / 86400000);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="w-full flex items-center gap-2 text-left group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
                    <span className="text-[11px] text-slate-400 group-hover:text-slate-200 truncate flex-1 transition-colors">
                      {c.source_name.replace(/\.(md|txt|pdf)$/i, '')}
                    </span>
                    <span className="text-[9px] font-mono text-slate-700 shrink-0">{days}d</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tree Insight */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs">🌿</span>
            <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Tree Insight</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{insight}</p>
          {catStats.length > 0 && (
            <Link
              to="/quiz"
              className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[10px] font-bold transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(8,145,178,0.2))',
                border: '1px solid rgba(124,58,237,0.3)',
                color: '#a78bfa',
              }}
            >
              <Sparkles size={10} />
              <span>Start Quiz Session</span>
              <ArrowRight size={10} />
            </Link>
          )}
        </div>

        {/* Recent discoveries placeholder */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Recent Discoveries</span>
          </div>
          <div className="space-y-2">
            {chunks.filter(c => c.access_count > 0).slice(0, 3).map(c => (
              <button key={c.id} onClick={() => setSelected(c)} className="w-full text-left group">
                <div className="flex items-start gap-1.5">
                  <span className="text-[11px] mt-0.5">🔍</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 group-hover:text-slate-300 truncate transition-colors">
                      {c.source_name.replace(/\.(md|txt|pdf)$/i, '')}
                    </p>
                    <p className="text-[9px] font-mono text-slate-700">{formatRelativeTime(c.last_accessed)}</p>
                  </div>
                </div>
              </button>
            ))}
            {chunks.filter(c => c.access_count > 0).length === 0 && (
              <p className="text-[10px] text-slate-700">Quiz some cards to build history</p>
            )}
          </div>
        </div>
      </aside>

      {/* ── LEAF DETAIL MODAL ───────────────────────────────────────────────── */}
      {selected && <ChunkModal chunk={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
