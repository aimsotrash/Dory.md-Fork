import { useState } from 'react';
import { KnowledgeHealthTreemap } from '@/components/dashboard/KnowledgeHealthTreemap';
import { TimeMachineSlider } from '@/components/dashboard/TimeMachineSlider';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { RetentionChart } from '@/components/dashboard/RetentionChart';
import { ChunkCard } from '@/components/chunks/ChunkCard';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import mockChunks from '@/data/mock_chunks.json';
import type { Chunk } from '@/lib/types';

const fadingChunks = (mockChunks as Chunk[])
  .filter((c) => (c.retention ?? 1) < 0.5)
  .slice(0, 3);

export function Dashboard() {
  const [timeOffset, setTimeOffset] = useState(0);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Good morning{' '}
            <span className="text-gradient">Memory OS</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Here's the state of your knowledge today
          </p>
        </div>
        <Link
          to="/quiz"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-nebula-500/15 hover:bg-nebula-500/25 border border-nebula-500/30 text-nebula-300 rounded-xl text-sm font-medium transition-all duration-200"
        >
          <Sparkles size={14} />
          Start quiz
          <ArrowRight size={12} />
        </Link>
      </div>

      <StatsRow />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <KnowledgeHealthTreemap timeOffsetHours={timeOffset} />
          <RetentionChart />
        </div>

        <div className="space-y-4">
          <TimeMachineSlider value={timeOffset} onChange={setTimeOffset} />

          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Fading now
              </h3>
              <Link to="/search" className="text-[11px] text-nebula-400 hover:text-nebula-300 flex items-center gap-1">
                View all <ArrowRight size={10} />
              </Link>
            </div>
            <div className="space-y-2">
              {fadingChunks.map((chunk) => (
                <ChunkCard
                  key={chunk.id}
                  chunk={chunk}
                  compact
                  className="!p-3 text-xs"
                />
              ))}
              {fadingChunks.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-4">
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
