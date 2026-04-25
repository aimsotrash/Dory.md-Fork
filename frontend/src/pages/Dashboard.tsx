import { useState } from 'react';
import { KnowledgeHealthTreemap } from '@/components/dashboard/KnowledgeHealthTreemap';
import { TimeMachineSlider } from '@/components/dashboard/TimeMachineSlider';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { RetentionChart } from '@/components/dashboard/RetentionChart';
import { ChunkCard } from '@/components/chunks/ChunkCard';
import { Link } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Sparkles } from 'lucide-react';
import mockChunks from '@/data/mock_chunks.json';
import type { Chunk } from '@/lib/types';

const fadingChunks = (mockChunks as Chunk[])
  .filter((c) => (c.retention ?? 1) < 0.5)
  .slice(0, 3);

export function Dashboard() {
  const [timeOffset, setTimeOffset] = useState(0);

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
            Good morning,{' '}
            <span className="text-gradient-nebula">Shraddha</span>
          </h1>
          <p className="text-slate-500 text-sm">
            Your knowledge base has <span className="text-slate-300 font-medium">90 memories</span> — 12 are fading right now.
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
