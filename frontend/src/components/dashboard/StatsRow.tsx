import { Brain, TrendingDown, Zap, Target } from 'lucide-react';

interface Stat {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Brain;
  color: string;
  glow: string;
}

const stats: Stat[] = [
  {
    label: 'Total memories',
    value: '90',
    sub: '+3 this week',
    icon: Brain,
    color: 'text-nebula-400',
    glow: 'rgba(124, 58, 237, 0.2)',
  },
  {
    label: 'Fading fast',
    value: '12',
    sub: 'Need review',
    icon: TrendingDown,
    color: 'text-flare-400',
    glow: 'rgba(249, 115, 22, 0.2)',
  },
  {
    label: 'Quiz streak',
    value: '5',
    sub: 'Days in a row',
    icon: Zap,
    color: 'text-pulsar-400',
    glow: 'rgba(8, 145, 178, 0.2)',
  },
  {
    label: 'Mastered',
    value: '43',
    sub: '≥ 70% retention',
    icon: Target,
    color: 'text-green-400',
    glow: 'rgba(74, 222, 128, 0.2)',
  },
];

export function StatsRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ label, value, sub, icon: Icon, color, glow }) => (
        <div
          key={label}
          className="glass-card p-4 space-y-2 hover:border-cosmos-600/60 transition-all duration-200"
        >
          <div className="flex items-start justify-between">
            <p className="text-xs text-slate-500">{label}</p>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: glow }}
            >
              <Icon size={13} className={color} />
            </div>
          </div>
          <p className={`text-2xl font-mono font-bold ${color}`}>{value}</p>
          {sub && <p className="text-[11px] text-slate-600">{sub}</p>}
        </div>
      ))}
    </div>
  );
}
