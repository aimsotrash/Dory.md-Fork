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
  const retention = chunk.retention ?? 0.5;
  const color = retentionToColor(retention);
  const label = retentionToLabel(retention);
  const catColor = categoryColors[chunk.category] ?? '#64748b';

  return (
    <div
      className={cn(
        'glass-card-hover p-4 group cursor-pointer animate-fade-in',
        className
      )}
      style={{ '--accent': color } as React.CSSProperties}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-1 rounded-full self-stretch transition-all duration-300"
          style={{
            background: `linear-gradient(180deg, ${color} 0%, ${color}40 100%)`,
            boxShadow: `0 0 6px ${color}60`,
          }}
        />

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="tag font-medium"
                style={{ color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}35` }}
              >
                {chunk.category}
              </span>
              {score !== undefined && (
                <span className="tag text-pulsar-400 bg-pulsar-500/10 border border-pulsar-500/20">
                  <Star size={9} /> {Math.round(score * 100)}% match
                </span>
              )}
            </div>
            <div
              className="shrink-0 text-xs font-mono font-semibold px-2 py-0.5 rounded-full border"
              style={{
                color,
                borderColor: `${color}40`,
                background: `${color}15`,
              }}
            >
              {formatRetentionPct(retention)} · {label}
            </div>
          </div>

          {highlight ? (
            <p
              className="text-sm text-slate-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlight }}
            />
          ) : (
            <p className="text-sm text-slate-300 leading-relaxed">
              {compact ? truncate(chunk.content, 120) : chunk.content}
            </p>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <FileText size={11} />
              <span className="truncate max-w-[160px]">{chunk.source_name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Clock size={11} />
              <span>{formatRelativeTime(chunk.last_accessed)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <TrendingDown size={11} />
              <span>{chunk.access_count}× reviewed</span>
            </div>
          </div>

          {chunk.tags && chunk.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag size={10} className="text-slate-600" />
              {chunk.tags.map((t) => (
                <span key={t} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-1 bg-cosmos-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${retention * 100}%`,
                  background: `linear-gradient(90deg, ${color}90 0%, ${color} 100%)`,
                  boxShadow: `0 0 6px ${color}50`,
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-600 w-8 text-right">
              {formatRetentionPct(retention)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
