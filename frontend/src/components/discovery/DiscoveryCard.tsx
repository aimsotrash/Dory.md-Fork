import { X, Sparkles, Clock, FileText, ArrowRight, Zap } from 'lucide-react';
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
      className="animate-slide-in-right relative rounded-2xl overflow-hidden mb-2"
      style={{
        background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(5,8,16,0.95) 60%)',
        border: '1px solid rgba(249,115,22,0.35)',
        boxShadow: '0 0 40px rgba(249,115,22,0.12), 0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'rgba(249,115,22,0.15)', filter: 'blur(40px)' }}
      />

      <div className="relative flex items-start gap-4 p-5">
        {/* Icon */}
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center animate-float"
          style={{
            background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(249,115,22,0.1))',
            border: '1px solid rgba(249,115,22,0.4)',
            boxShadow: '0 0 20px rgba(249,115,22,0.3)',
          }}
        >
          <Sparkles size={16} className="text-flare-300" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-flare-400 uppercase tracking-wider">
              I just found something!
            </span>
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border"
              style={{ color, borderColor: `${color}40`, background: `${color}15`, boxShadow: `0 0 8px ${color}30` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              {label} — {formatRetentionPct(retention)}
            </div>
          </div>

          {/* Content */}
          <p className="text-sm text-slate-200 font-medium leading-relaxed line-clamp-2 mb-2">
            {chunk.content}
          </p>

          <p className="text-xs text-slate-500 mb-3">{reason}</p>

          {/* Meta + CTA */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <Clock size={10} /> {formatRelativeTime(chunk.last_accessed)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <FileText size={10} /> {chunk.source_name}
            </div>
            <Link
              to={`/search?q=${encodeURIComponent(chunk.content.slice(0, 50))}`}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-flare-400 hover:text-flare-300 transition-colors"
            >
              <Zap size={11} /> Review now <ArrowRight size={11} />
            </Link>
          </div>

          {/* Retention bar */}
          <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-[10px] text-slate-700">Retention</span>
            <div className="flex-1 retention-bar-track">
              <div
                className="retention-bar-fill"
                style={{ width: `${retention * 100}%`, background: color, color }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>
              {formatRetentionPct(retention)}
            </span>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 transition-all hover:bg-white/5"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
