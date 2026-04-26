import { useState, useEffect } from 'react';
import { KnowledgeHealthTreemap } from '@/components/dashboard/KnowledgeHealthTreemap';
import { TimeMachineSlider } from '@/components/dashboard/TimeMachineSlider';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { RetentionChart } from '@/components/dashboard/RetentionChart';
import { ChunkCard } from '@/components/chunks/ChunkCard';
import { Link } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getFading, getStats } from '@/lib/api';
import type { BackendChunk, StatsResponse } from '@/lib/types';
import type { Chunk, Category } from '@/lib/types';

function toChunk(c: BackendChunk): Chunk {
  const cat = (c.category ?? '').toLowerCase();
  const category: Category =
    cat.includes('computer') || cat.includes('technical') || cat.includes('code') || cat.includes('algorithm') || cat.includes('math') || cat.includes('data') || cat.includes('design')
      ? 'technical'
      : cat.includes('personal')
      ? 'personal'
      : cat.includes('reference')
      ? 'reference'
      : 'general';

  const baseName = (c.source_file ?? '').split(/[\\/]/).pop() ?? c.source_file;
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

export function Dashboard() {
  const { user } = useAuth();
  const [timeOffset, setTimeOffset] = useState(0);
  const [fadingChunks, setFadingChunks] = useState<Chunk[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    getFading(5).then(r => setFadingChunks(r.chunks.map(toChunk))).catch(() => {});
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Hero */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
              style={{
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.35)',
                color: '#a78bfa',
              }}
            >
              Memory OS active
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">
            {greeting},{' '}
            <span className="text-gradient-nebula">{firstName}</span>
          </h1>
          <p className="text-slate-500 text-sm">
            {stats ? (
              <>
                Your knowledge base has{' '}
                <span className="text-slate-300 font-medium">{stats.total_chunks} memories</span>
                {stats.fading > 0 && <> — <span className="text-flare-400 font-medium">{stats.fading} are fading</span> right now.</>}
                {stats.fading === 0 && <> — all memories are strong.</>}
              </>
            ) : (
              'Loading your knowledge base...'
            )}
          </p>
        </div>

        <Link
          to="/quiz"
          className="hidden sm:flex shrink-0 items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)',
            boxShadow: '0 0 24px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <Sparkles size={14} />
          Start quiz
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Stats */}
      <StatsRow />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left — charts */}
        <div className="lg:col-span-2 space-y-4">
          <KnowledgeHealthTreemap timeOffsetHours={timeOffset} />
          <RetentionChart />
        </div>

        {/* Right — controls + fading */}
        <div className="space-y-4">
          <TimeMachineSlider value={timeOffset} onChange={setTimeOffset} />

          {/* Fading Now */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-2">
                <BrainCircuit size={13} className="text-flare-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Fading now</span>
              </div>
              <Link
                to="/search"
                className="text-[11px] text-nebula-400 hover:text-nebula-300 flex items-center gap-1 font-medium transition-colors"
              >
                View all <ArrowRight size={10} />
              </Link>
            </div>

            <div className="p-3 space-y-2">
              {fadingChunks.map((chunk) => (
                <ChunkCard key={chunk.id} chunk={chunk} compact />
              ))}
              {fadingChunks.length === 0 && (
                <p className="text-xs text-slate-700 text-center py-6">
                  No memories fading right now 🎉
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
