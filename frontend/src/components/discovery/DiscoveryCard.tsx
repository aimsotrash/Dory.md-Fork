import { X, Sparkles, Clock, TrendingDown, ArrowRight } from 'lucide-react';
import { retentionToColor, retentionToLabel } from '@/styles/theme';
import { formatRetentionPct, formatRelativeTime } from '@/lib/utils';
import type { DiscoveryResponse } from '@/lib/types';
import { Link } from 'react-router-dom';

interface DiscoveryCardProps {
  discovery: Extract<DiscoveryResponse, { has_discovery: true }>;
  onDismiss: () => void;
}

export function DiscoveryCard({ discovery, onDismiss }: DiscoveryCardProps) {
  const { chunk, reason } = discovery;
  const retention = chunk.retention ?? 0.5;
  const color = retentionToColor(retention);
  const label = retentionToLabel(retention);

  return (
    <div
      className="animate-slide-in-right relative rounded-xl border-2 p-4 mb-2 overflow-hidden"
      style={{
        borderColor: '#f97316',
        background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(15,23,42,0.95) 60%)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-2xl"
          style={{ background: '#f97316' }}
        />
      </div>

      <div className="relative flex items-start gap-3">
        <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-flare-500/20 border border-flare-500/40 flex items-center justify-center animate-float">
          <Sparkles size={14} className="text-flare-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-flare-400 uppercase tracking-wide">
              I just found something!
            </span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border"
              style={{
                color,
                borderColor: `${color}40`,
                background: `${color}15`,
              }}
            >
              {label} — {formatRetentionPct(retention)}
            </span>
          </div>

          <p className="text-sm text-slate-200 font-medium leading-relaxed line-clamp-2 mb-2">
            {chunk.content}
          </p>

          <p className="text-xs text-slate-400 mb-3">{reason}</p>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={11} />
              <span>{formatRelativeTime(chunk.last_accessed)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <TrendingDown size={11} />
              <span>{chunk.source_name}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Link
                to={`/search?q=${encodeURIComponent(chunk.content.slice(0, 50))}`}
                className="flex items-center gap-1 text-xs text-nebula-400 hover:text-nebula-300 transition-colors"
              >
                Review now
                <ArrowRight size={11} />
              </Link>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-slate-600">Retention</span>
            <div className="flex-1 h-1 bg-cosmos-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${retention * 100}%`,
                  background: color,
                  boxShadow: `0 0 8px ${color}80`,
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {formatRetentionPct(retention)}
            </span>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-cosmos-700/50 transition-all duration-200"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
