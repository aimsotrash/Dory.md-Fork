import { useState, useEffect, useCallback } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { getHealth } from '@/lib/api';
import { retentionToColor, retentionToLabel, urgencyColors, urgencyBg } from '@/styles/theme';
import { formatRetentionPct } from '@/lib/utils';
import { TreemapSkeleton } from '@/components/ui/LoadingSkeleton';
import type { HealthResponse, CategoryStat } from '@/lib/types';
import { RefreshCw, Info } from 'lucide-react';

interface KnowledgeHealthTreemapProps {
  timeOffsetHours: number;
}

interface TreeNode {
  name: string;
  size: number;
  stat: CategoryStat;
}

function CustomTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload?: TreeNode }> }) {
  if (!active || !payload?.length) return null;
  const node = payload[0]?.payload;
  if (!node?.stat) return null;
  const { stat } = node;
  const color = retentionToColor(stat.avg_retention);
  return (
    <div className="glass-card px-3 py-2.5 text-xs space-y-1.5 min-w-[160px] border-cosmos-600">
      <p className="font-semibold text-slate-200 capitalize">{stat.name}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Retention</span>
        <span className="font-mono" style={{ color }}>{formatRetentionPct(stat.avg_retention)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Chunks</span>
        <span className="font-mono text-slate-300">{stat.count}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Status</span>
        <span style={{ color }}>{retentionToLabel(stat.avg_retention)}</span>
      </div>
      <div
        className="text-[10px] px-1.5 py-0.5 rounded-full text-center capitalize"
        style={{
          color: urgencyColors[stat.urgency],
          background: urgencyBg[stat.urgency],
        }}
      >
        {stat.urgency} urgency
      </div>
    </div>
  );
}

function CustomContent(props: {
  x?: number; y?: number; width?: number; height?: number; name?: string; stat?: CategoryStat;
  depth?: number; root?: boolean;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, stat, depth } = props;
  if (!stat || depth === 0 || width < 30 || height < 30) return null;
  const color = retentionToColor(stat.avg_retention);
  const pct = formatRetentionPct(stat.avg_retention);

  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={width - 2}
        height={height - 2}
        rx={8}
        ry={8}
        fill={`${color}18`}
        stroke={`${color}50`}
        strokeWidth={1.5}
      />
      <rect
        x={x + 1}
        y={y + 1}
        width={width - 2}
        height={3}
        rx={0}
        fill={`${color}70`}
      />
      {width > 60 && height > 50 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.9)"
            fontSize={Math.min(13, width / 6)}
            fontWeight={600}
            fontFamily="Inter, sans-serif"
            style={{ textTransform: 'capitalize' }}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color}
            fontSize={Math.min(11, width / 7)}
            fontFamily="JetBrains Mono, monospace"
            fontWeight={500}
          >
            {pct}
          </text>
          {height > 70 && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 26}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(148,163,184,0.7)"
              fontSize={Math.min(9, width / 9)}
              fontFamily="Inter, sans-serif"
            >
              {stat.count} chunks
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function KnowledgeHealthTreemap({ timeOffsetHours }: KnowledgeHealthTreemapProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealth(timeOffsetHours);
      setHealth(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [timeOffsetHours]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <TreemapSkeleton />;
  if (error || !health) {
    return (
      <div className="glass-card p-6 text-center space-y-3">
        <p className="text-slate-400 text-sm">{error ?? 'No data'}</p>
        <button className="btn-secondary flex items-center gap-2 mx-auto text-xs" onClick={load}>
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const treeData = health.categories.map((c) => ({
    name: c.name,
    size: c.count,
    stat: c,
  }));

  const avgRetention =
    health.categories.reduce((sum, c) => sum + c.avg_retention * c.count, 0) /
    health.total_chunks;

  const critical = health.categories.filter((c) => c.urgency === 'high');

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Knowledge Health</h2>
          <p className="text-xs text-slate-500 mt-0.5">{health.total_chunks} total chunks tracked</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500">Overall retention</p>
            <p
              className="text-lg font-mono font-bold"
              style={{ color: retentionToColor(avgRetention) }}
            >
              {formatRetentionPct(avgRetention)}
            </p>
          </div>
          <button
            onClick={load}
            className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-cosmos-800 transition-all"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {critical.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-900/30">
          <Info size={12} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-300">
            <span className="font-semibold">{critical.map((c) => c.name).join(', ')}</span>
            {' '}need{critical.length === 1 ? 's' : ''} attention — review soon
          </p>
        </div>
      )}

      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treeData}
            dataKey="size"
            nameKey="name"
            content={<CustomContent />}
          >
            <Tooltip content={<CustomTooltipContent />} />
          </Treemap>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        {[
          { label: 'Strong', min: 0.7, color: '#7c3aed' },
          { label: 'Fading', min: 0.5, color: '#0891b2' },
          { label: 'Weak', min: 0.3, color: '#f97316' },
          { label: 'Critical', min: 0, color: '#dc2626' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
            <span className="text-[11px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
