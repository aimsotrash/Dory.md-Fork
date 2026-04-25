import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingDown } from 'lucide-react';

function buildCurveData(stabilityS = 72, complexityK = 1.0) {
  const points = [];
  for (let h = 0; h <= 4320; h += h < 48 ? 2 : h < 720 ? 24 : 168) {
    points.push({
      hours: h,
      retention: Math.round(Math.exp(-h / (stabilityS * complexityK)) * 100),
      label: h === 0 ? 'Now' : h < 24 ? `${h}h` : h < 168 ? `${Math.round(h / 24)}d` : `${Math.round(h / 168)}w`,
    });
  }
  return points;
}

const data = buildCurveData();

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs border-cosmos-600">
      <p className="text-slate-400">{label}</p>
      <p className="text-nebula-400 font-mono font-semibold">{payload[0]?.value ?? 0}% retention</p>
    </div>
  );
}

export function RetentionChart() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingDown size={14} className="text-pulsar-400" />
        <h2 className="text-sm font-semibold text-slate-200">Forgetting Curve</h2>
        <span className="text-[10px] text-slate-600 font-mono ml-auto">S=72 k=1.0</span>
      </div>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="retention"
              stroke="#7c3aed"
              strokeWidth={2}
              fill="url(#retGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
