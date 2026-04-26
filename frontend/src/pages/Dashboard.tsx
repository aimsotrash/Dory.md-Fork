import { useState, useEffect } from 'react';
import { KnowledgeHealthTreemap } from '@/components/dashboard/KnowledgeHealthTreemap';
import { TimeMachineSlider } from '@/components/dashboard/TimeMachineSlider';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { RetentionChart } from '@/components/dashboard/RetentionChart';
import { ChunkCard } from '@/components/chunks/ChunkCard';
import { Link } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Zap } from 'lucide-react';
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
    <div className="space-y-5">

      {/* Hero */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Memory OS active</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-slate-500 text-sm">
            {stats ? (
              <>
                <span className="text-slate-400 font-medium">{stats.total_chunks} memories</span>
                {stats.fading > 0 && <> · <span className="text-amber-400 font-medium">{stats.fading} fading</span></>}
                {stats.weak > 0 && <> · <span className="text-orange-400 font-medium">{stats.weak} weak</span></>}
                {stats.critical > 0 && <> · <span className="text-red-400 font-medium">{stats.critical} critical</span></>}
                {stats.fading === 0 && stats.weak === 0 && stats.critical === 0 && <> · all strong</>}
              </>
            ) : (
              'Loading...'
            )}
          </p>
        </div>

        <Link to="/quiz" className="hidden sm:flex shrink-0 items-center gap-2 corp-btn-primary px-4 py-2">
          <Zap size={13} />
          Start quiz
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

        {/* Right — time machine + fading */}
        <div className="space-y-4">
          <TimeMachineSlider value={timeOffset} onChange={setTimeOffset} />

          {/* Fading Now */}
          <div className="gcard overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <BrainCircuit size={13} className="text-amber-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fading now</span>
              </div>
              <Link
                to="/library"
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={10} />
              </Link>
            </div>

            <div className="p-3 space-y-2">
              {fadingChunks.map((chunk) => (
                <ChunkCard key={chunk.id} chunk={chunk} compact />
              ))}
              {fadingChunks.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-6">
                  No memories fading right now
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
