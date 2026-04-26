import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Search, BrainCircuit, BookOpen,
  CalendarDays, NotebookPen, Timer, Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { to: '/',        label: 'Dashboard',  icon: LayoutDashboard, exact: true },
      { to: '/search',  label: 'Search',     icon: Search },
      { to: '/library', label: 'Library',    icon: BookOpen },
    ],
  },
  {
    label: 'Learn',
    items: [
      { to: '/quiz',    label: 'Quiz Mode',  icon: BrainCircuit },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/notes',    label: 'Note Editor', icon: NotebookPen },
      { to: '/pomodoro', label: 'Pomodoro',    icon: Timer },
      { to: '/calendar', label: 'Calendar',    icon: CalendarDays },
    ],
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside
      className="hidden md:flex flex-col w-52 shrink-0 min-h-[calc(100vh-49px)]"
      style={{
        background: '#0f0f0f',
        borderRight: '1px solid #1a1a1a',
      }}
    >
      <div className="flex flex-col flex-1 p-2 gap-4 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <p
              className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
              style={{ color: '#3a3a3a' }}
            >
              {group.label}
            </p>
            <nav className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-100',
                      isActive
                        ? 'text-white'
                        : 'text-[#555] hover:text-[#ccc] hover:bg-white/[0.04]',
                    ].join(' ')
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { background: '#1f1f1f', color: '#fff' }
                      : {}
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={14}
                        style={{ color: isActive ? '#7c3aed' : undefined, flexShrink: 0 }}
                      />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t" style={{ borderColor: '#1a1a1a' }}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [
              'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors mb-0.5',
              isActive ? 'text-white' : 'text-[#555] hover:text-[#ccc] hover:bg-white/[0.04]',
            ].join(' ')
          }
          style={({ isActive }) => isActive ? { background: '#1f1f1f' } : {}}
        >
          <Settings size={14} style={{ flexShrink: 0 }} />
          Settings
        </NavLink>

        <div
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md"
          style={{ marginTop: '4px' }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: '#7c3aed', color: '#fff' }}
          >
            {(user?.name?.[0] ?? 'D').toUpperCase()}
          </div>
          <span className="flex-1 text-[12px] truncate" style={{ color: '#555' }}>
            {user?.name ?? 'Demo User'}
          </span>
          <button
            onClick={logout}
            className="transition-colors"
            style={{ color: '#333' }}
            title="Sign out"
            onMouseEnter={e => (e.currentTarget.style.color = '#666')}
            onMouseLeave={e => (e.currentTarget.style.color = '#333')}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
