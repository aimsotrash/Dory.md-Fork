import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Search, BrainCircuit, BookOpen,
  CalendarDays, NotebookPen, Timer, Settings,
  Activity, ChevronRight, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/',         label: 'Dashboard',   icon: LayoutDashboard, exact: true },
  { to: '/search',   label: 'Search',       icon: Search },
  { to: '/quiz',     label: 'Quiz Mode',    icon: BrainCircuit },
  { to: '/library',  label: 'Library',      icon: BookOpen },
  { to: '/notes',    label: 'Note Editor',  icon: NotebookPen },
  { to: '/pomodoro', label: 'Pomodoro',     icon: Timer },
  { to: '/calendar', label: 'Calendar',     icon: CalendarDays },
  { to: '/notion',   label: 'Notion',       icon: FileText },
  { to: '/settings', label: 'Settings',     icon: Settings },
];

const bars = [
  { label: 'Technical', pct: 82, color: '#7c3aed' },
  { label: 'General',   pct: 63, color: '#0891b2' },
  { label: 'Personal',  pct: 45, color: '#f97316' },
  { label: 'Reference', pct: 28, color: '#dc2626' },
];

export function Sidebar() {
  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 min-h-[calc(100vh-49px)] p-3 gap-0.5"
      style={{
        background: 'rgba(5,8,16,0.5)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => cn(isActive ? 'nav-item-active' : 'nav-item')}
          >
            {({ isActive }) => (
              <>
                <Icon size={14} className={isActive ? 'text-nebula-300' : 'text-slate-600'} />
                <span className="flex-1 text-sm">{label}</span>
                {isActive && <ChevronRight size={11} className="text-nebula-500 opacity-50" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 space-y-4">
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

        {/* Category health bars */}
        <div className="space-y-2.5 px-1">
          <div className="flex items-center gap-1.5 mb-3">
            <Activity size={10} className="text-slate-700" />
            <p className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">Health</p>
          </div>
          {bars.map(({ label, pct, color }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-slate-600">{label}</span>
                <span className="text-[10px] font-mono" style={{ color }}>{pct}%</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}80` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick stats */}
        <div className="rounded-xl p-3 space-y-2"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { label: 'Total chunks', value: '90',  color: 'text-nebula-400' },
            { label: 'Avg retention', value: '56%', color: 'text-pulsar-400' },
            { label: 'Critical',      value: '12',  color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[10px] text-slate-700">{label}</span>
              <span className={`text-[11px] font-mono font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
