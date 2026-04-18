import { NavLink } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { cn } from '../lib/utils'

const tabs = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/schedule',
    label: 'Schedule',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: '/coach',
    label: 'Coach',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
]

export function SideNav() {
  return (
    <nav className="hidden sm:flex flex-col flex-shrink-0 w-20 border-r border-border bg-surface">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 py-4 px-2 text-[10px] font-mono-dm uppercase tracking-wider transition-colors border-l-2',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            )
          }
        >
          {tab.icon}
          {tab.label}
        </NavLink>
      ))}
      <div className="mt-auto flex justify-center py-4 px-2">
        <UserButton afterSignOutUrl="/login" />
      </div>
    </nav>
  )
}

export function BottomNav() {
  return (
    <nav
      className="flex-shrink-0 flex sm:hidden border-t border-border bg-surface"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 pt-2 pb-1 text-[10px] font-mono-dm uppercase tracking-wider transition-colors border-t-2',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            )
          }
        >
          {tab.icon}
          {tab.label}
        </NavLink>
      ))}
      <div className="flex flex-col items-center justify-center px-4 pt-2 pb-1 border-t-2 border-transparent">
        <UserButton afterSignOutUrl="/login" />
      </div>
    </nav>
  )
}
