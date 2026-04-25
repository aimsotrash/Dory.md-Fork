import { useRef } from 'react';
import { Clock, FileText, Tag, TrendingDown, Star } from 'lucide-react';
import { retentionToColor, retentionToLabel, categoryColors } from '@/styles/theme';
import { formatRetentionPct, formatRelativeTime, truncate } from '@/lib/utils';
import type { Chunk } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChunkCardProps {
  chunk: Chunk;
  score?: number;
  highlight?: string;
  compact?: boolean;
  className?: string;
}

export function ChunkCard({ chunk, score, highlight, compact, className }: ChunkCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const retention = chunk.retention ?? 0.5;
  const color = retentionToColor(retention);
  const label = retentionToLabel(retention);
  const catColor = categoryColors[chunk.category] ?? '#64748b';

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1000px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--mx', `${mx}%`);
    el.style.setProperty('--my', `${my}%`);
  }

  function onMouseLeave() {
    if (ref.current) ref.current.style.transform = '';
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn('animate-fade-in', className)}
      style={{ transition: 'transform 0.18s ease', willChange: 'transform' }}
    >
      <div
        className="gcard gcard-spotlight relative overflow-hidden cursor-pointer"
        style={{
          borderColor: `rgba(255,255,255,0.06)`,
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = `${color}35`;
          el.style.boxShadow = `0 0 0 1px ${color}10 inset, 0 1px 0 rgba(255,255,255,0.08) inset, 0 25px 70px rgba(0,0,0,0.5), 0 0 25px ${color}15`;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = '';
          el.style.boxShadow = '';
        }}
      >
        {/* Colored top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[16px]"
          style={{
            background: `linear-gradient(90deg, ${color}00 0%, ${color} 30%, ${color}80 70%, ${color}00 100%)`,
          }}
        />

        <div className={cn('p-4', compact ? 'p-3' : 'p-5')}>
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="tag capitalize font-semibold"
                style={{
                  color: catColor,
                  background: `${catColor}15`,
                  border: `1px solid ${catColor}30`,
                }}
              >
                {chunk.category}
              </span>
              {score !== undefined && (
                <span className="tag text-pulsar-300 bg-pulsar-500/10 border border-pulsar-500/20">
                  <Star size={9} /> {Math.round(score * 100)}%
                </span>
              )}
            </div>

            {/* Retention pill */}
            <div
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold"
              style={{
                color,
                borderColor: `${color}40`,
                background: `${color}12`,
                boxShadow: `0 0 10px ${color}25`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 4px ${color}` }}
              />
              {formatRetentionPct(retention)}
              <span className="opacity-60">·</span>
              {label}
            </div>
          </div>

          {/* Content */}
          <p className={cn('text-slate-300 leading-relaxed mb-3', compact ? 'text-xs line-clamp-2' : 'text-sm')}>
            {highlight ? (
              <span dangerouslySetInnerHTML={{ __html: highlight }} />
            ) : (
              compact ? truncate(chunk.content, 110) : chunk.content
            )}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-4 flex-wrap mb-3">
            {[
              { icon: FileText, text: chunk.source_name, max: 140 },
              { icon: Clock, text: formatRelativeTime(chunk.last_accessed) },
              { icon: TrendingDown, text: `${chunk.access_count}× reviewed` },
            ].map(({ icon: Icon, text, max }) => (
              <div key={text} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <Icon size={10} />
                <span className={max ? `truncate max-w-[${max}px]` : ''}>{text}</span>
              </div>
            ))}
          </div>

          {/* Tags */}
          {!compact && chunk.tags && chunk.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <Tag size={10} className="text-slate-700" />
              {chunk.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] text-slate-600 hover:text-nebula-400 transition-colors cursor-pointer font-mono"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Retention bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 retention-bar-track">
              <div
                className="retention-bar-fill"
                style={{
                  width: `${retention * 100}%`,
                  background: `linear-gradient(90deg, ${color}60, ${color})`,
                  boxShadow: `0 0 8px ${color}60`,
                  color,
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-600 w-8 text-right tabular-nums">
              {formatRetentionPct(retention)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
