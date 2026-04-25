import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/',         icon: '▦', label: 'DASHBOARD' },
  { to: '/notes',    icon: '✎', label: 'NOTES'     },
  { to: '/search',   icon: '⌕', label: 'SEARCH'    },
  { to: '/library',  icon: '▤', label: 'LIBRARY'   },
  { to: '/calendar', icon: '▩', label: 'CALENDAR'  },
  { to: '/pomodoro', icon: '◉', label: 'POMODORO'  },
  { to: '/quiz',     icon: '?', label: 'QUIZ'       },
  { to: '/notion',   icon: 'N', label: 'NOTION'     },
]

export function Sidebar() {
  const loc = useLocation()
  return (
    <aside className="hidden md:flex flex-col w-52 shrink-0 bg-ink-800 border-r border-ink-600 min-h-[calc(100vh-49px)]">
      <nav className="flex flex-col py-3 flex-1">
        {NAV.map(({ to, icon, label }) => {
          const active = to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={active ? 'nav-item-active' : 'nav-item'}
            >
              <span className={cn('font-mono text-sm w-5 text-center', active ? 'text-metro-amber' : 'text-ink-400')}>
                {icon}
              </span>
              <span className="text-[11px] font-mono font-semibold tracking-widest">{label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-ink-600">
        <p className="label mb-2">System</p>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-ink-400">ENGINE</span>
            <span className="text-[10px] font-mono text-metro-green">ACTIVE</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-ink-400">DECAY</span>
            <span className="text-[10px] font-mono text-terminal-amber">RUNNING</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
