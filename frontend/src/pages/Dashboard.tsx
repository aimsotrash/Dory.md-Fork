import { useState } from 'react'
import { KnowledgeHealthTreemap } from '@/components/dashboard/KnowledgeHealthTreemap'
import { TimeMachineSlider } from '@/components/dashboard/TimeMachineSlider'
import { StatsRow } from '@/components/dashboard/StatsRow'
import { RetentionChart } from '@/components/dashboard/RetentionChart'
import { ChunkCard } from '@/components/chunks/ChunkCard'
import { Link } from 'react-router-dom'
import mockChunks from '@/data/mock_chunks.json'
import type { Chunk } from '@/lib/types'

const fadingChunks = (mockChunks as Chunk[])
  .filter(c => (c.retention ?? 1) < 0.5)
  .slice(0, 3)

export function Dashboard() {
  const [timeOffset, setTimeOffset] = useState(0)

  return (
    <div className="space-y-5 max-w-5xl animate-fade-up">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-50 tracking-tight">
            Knowledge Dashboard
          </h1>
          <p className="label mt-1">Forgetting curve status — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/quiz" className="btn">
            <span className="font-mono">?</span> Quiz
          </Link>
          <Link to="/notes" className="btn-primary">
            <span className="font-mono">✎</span> New Note
          </Link>
        </div>
      </div>

      {/* Stats tiles */}
      <StatsRow />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: treemap + chart */}
        <div className="lg:col-span-2 space-y-4">
          <KnowledgeHealthTreemap timeOffsetHours={timeOffset} />
          <RetentionChart />
        </div>

        {/* Right: time machine + fading feed */}
        <div className="space-y-4">
          <TimeMachineSlider value={timeOffset} onChange={setTimeOffset} />

          <div className="tile tile-red p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="label">Fading Now</p>
              <Link to="/search" className="text-[10px] font-mono text-ink-400 hover:text-metro-amber transition-colors">
                VIEW ALL →
              </Link>
            </div>
            <div className="space-y-2">
              {fadingChunks.map(chunk => (
                <ChunkCard key={chunk.id} chunk={chunk} compact className="!p-3 text-xs" />
              ))}
              {fadingChunks.length === 0 && (
                <p className="text-xs font-mono text-ink-500 text-center py-4">
                  No memories fading — memory healthy
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick action tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { to: '/notes',    label: 'Write a Note',    icon: '✎', color: 'teal',   sub: 'Markdown editor + Notion sync' },
          { to: '/pomodoro', label: 'Focus Session',   icon: '◉', color: 'red',    sub: '25-min deep work timer'        },
          { to: '/calendar', label: 'Activity Log',    icon: '▩', color: 'purple', sub: 'Knowledge by date'             },
        ].map(({ to, label, icon, color, sub }) => (
          <Link
            key={to}
            to={to}
            className={`tile tile-${color} p-4 group hover:shadow-glow-amber transition-all`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className={`text-2xl font-mono text-metro-${color}`}>{icon}</span>
              <span className="text-[10px] font-mono text-ink-500 group-hover:text-ink-300 transition-colors">→</span>
            </div>
            <p className="font-display font-semibold text-ink-50 text-sm">{label}</p>
            <p className="text-[10px] font-mono text-ink-400 mt-0.5">{sub}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
