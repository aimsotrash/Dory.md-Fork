import { Brain, TrendingDown, Zap, Target } from 'lucide-react';
import { Card3D } from '@/components/ui/Card3D';

interface Stat {
  label: string;
  value: string;
  sub: string;
  icon: typeof Brain;
  gradient: string;
  textGradient: string;
  glow: string;
  ring: string;
  pct: number;
}

const stats: Stat[] = [
  {
    label: 'Total memories',
    value: '90',
    sub: '+3 this week',
    icon: Brain,
    gradient: 'from-nebula-600 to-nebula-400',
    textGradient: 'text-gradient-nebula',
    glow: 'rgba(124,58,237,0.5)',
    ring: '#7c3aed',
    pct: 90,
  },
  {
    label: 'Fading fast',
    value: '12',
    sub: 'Need review',
    icon: TrendingDown,
    gradient: 'from-flare-600 to-flare-400',
    textGradient: 'text-gradient-flare',
    glow: 'rgba(249,115,22,0.5)',
    ring: '#f97316',
    pct: 13,
  },
  {
    label: 'Quiz streak',
    value: '5',
    sub: 'Days in a row',
    icon: Zap,
    gradient: 'from-pulsar-600 to-pulsar-400',
    textGradient: 'text-gradient-pulsar',
    glow: 'rgba(8,145,178,0.5)',
    ring: '#0891b2',
    pct: 71,
  },
  {
    label: 'Mastered',
    value: '43',
    sub: '≥ 70% retention',
    icon: Target,
    gradient: 'from-green-600 to-green-400',
    textGradient: 'text-gradient-green',
    glow: 'rgba(34,197,94,0.5)',
    ring: '#22c55e',
    pct: 48,
  },
];

const R = 26;
const CIRC = 2 * Math.PI * R;

export function StatsRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ label, value, sub, icon: Icon, gradient, textGradient, glow, ring, pct }) => {
        const dash = (pct / 100) * CIRC;
        return (
          <Card3D key={label} className="p-5" intensity={8} shimmer>
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}
                style={{ boxShadow: `0 0 16px ${glow}` }}
              >
                <Icon size={16} className="text-white" />
              </div>

              {/* Circular progress ring */}
              <svg width="64" height="64" viewBox="0 0 64 64" className="-mr-1 -mt-1">
                <circle
                  cx="32" cy="32" r={R}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="3.5"
                />
                <circle
                  cx="32" cy="32" r={R}
                  fill="none"
                  stroke={ring}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${CIRC}`}
                  strokeDashoffset={CIRC * 0.25}
                  style={{ filter: `drop-shadow(0 0 4px ${ring})`, transition: 'stroke-dasharray 1s ease' }}
                />
                <text
                  x="32" y="32"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(148,163,184,0.7)"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  {pct}%
                </text>
              </svg>
            </div>

            <p className={`text-4xl font-mono font-black tracking-tight leading-none mb-1 animate-number ${textGradient}`}>
              {value}
            </p>
            <p className="text-[11px] font-semibold text-slate-300 mb-0.5">{label}</p>
            <p className="text-[10px] text-slate-600">{sub}</p>
          </Card3D>
        );
      })}
    </div>
  );
}
