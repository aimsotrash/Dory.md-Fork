import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  BrainCircuit,
  BookOpen,
  TrendingDown,
  Activity,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/quiz', label: 'Quiz Mode', icon: BrainCircuit },
  { to: '/library', label: 'Library', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const stats = [
  { label: 'Chunks tracked', value: '90', color: 'text-nebula-400' },
  { label: 'Fading now', value: '12', color: 'text-flare-400' },
  { label: 'Avg retention', value: '64%', color: 'text-pulsar-400' },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-cosmos-700/50 bg-cosmos-950/60 backdrop-blur-sm min-h-[calc(100vh-49px)] p-3 gap-1">
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(isActive ? 'nav-item-active' : 'nav-item')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={isActive ? 'text-nebula-400' : ''} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={12} className="text-nebula-500 opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-cosmos-700/40 space-y-3">
        <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest px-1">
          System stats
        </p>
        <div className="space-y-2">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between px-1">
              <span className="text-xs text-slate-500">{label}</span>
              <span className={cn('text-xs font-mono font-semibold', color)}>{value}</span>
            </div>
          ))}
        </div>

        <div className="glass-card p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Activity size={10} className="text-pulsar-400" />
            <span className="text-[10px] text-slate-400 font-mono">Memory health</span>
          </div>
          <div className="flex gap-0.5 h-1.5">
            <div className="flex-[3.4] bg-nebula-500 rounded-l-full opacity-80" title="strong" />
            <div className="flex-[1.8] bg-pulsar-500 opacity-80" title="fading" />
            <div className="flex-[2.7] bg-flare-500 opacity-80" title="weak" />
            <div className="flex-[1.1] bg-red-600 rounded-r-full opacity-80" title="critical" />
          </div>
          <div className="flex justify-between">
            <span className="text-[9px] text-slate-600 font-mono">Critical</span>
            <span className="text-[9px] text-slate-600 font-mono">Strong</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          <TrendingDown size={10} className="text-slate-600" />
          <span className="text-[10px] text-slate-600">Forgetting curve active</span>
        </div>
      </div>
    </aside>
  );
}
