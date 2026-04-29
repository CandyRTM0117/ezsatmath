'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NavItem { href: string; label: string; icon: string }

interface SidebarProps {
  role: 'admin' | 'student'
  userName: string
}

const adminNav: NavItem[] = [
  { href: '/admin/users',    label: 'Users',        icon: '👥' },
  { href: '/admin/problems', label: 'Problems',     icon: '📝' },
  { href: '/admin/exams',    label: 'Exam Tracker', icon: '📊' },
]

const studentNav: NavItem[] = [
  { href: '/student/dashboard',   label: 'Dashboard',   icon: '🏠' },
  { href: '/student/problems',    label: 'Problems',    icon: '📝' },
  { href: '/student/exam',        label: 'Exam',        icon: '📋' },
  { href: '/student/analytics',   label: 'Analytics',   icon: '📈' },
  { href: '/student/subscription',label: 'Subscription',icon: '💳' },
]

export default function Sidebar({ role, userName }: SidebarProps) {
  const [isOpen, setIsOpen]           = useState(false)   // mobile drawer
  const [isCollapsed, setIsCollapsed] = useState(false)   // desktop icon-only mode
  const pathname = usePathname()
  const router   = useRouter()
  const nav      = role === 'admin' ? adminNav : studentNav

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Mobile hamburger (fixed pill, hidden when drawer open) ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-xl shadow-lg"
          style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18"/>
          </svg>
        </button>
      )}

      {/* ── Mobile backdrop ── */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={[
          /* positioning: fixed overlay on mobile, in-flow on desktop */
          'fixed md:relative inset-y-0 left-0 z-40',
          /* height */
          'h-full flex flex-col shrink-0',
          /* smooth transitions for both translate and width */
          'transition-all duration-300 ease-in-out',
          /* width: mobile always full, desktop toggles */
          'w-56',
          isCollapsed ? 'md:w-16' : 'md:w-56',
          /* slide on mobile; always visible on desktop */
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{ background: '#0F172A', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >

        {/* ── Logo row ── */}
        <div
          className="flex items-center justify-between px-4 py-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {isCollapsed ? (
            <span className="text-lg font-extrabold text-white mx-auto select-none">Ez</span>
          ) : (
            <div className="overflow-hidden">
              <h1 className="text-xl font-extrabold tracking-tight text-white whitespace-nowrap">
                Ez<span className="text-blue-400">SAT</span>
              </h1>
              <p className="text-xs font-medium mt-0.5 capitalize whitespace-nowrap"
                style={{ color: 'rgba(148,163,184,0.6)' }}>
                {role}
              </p>
            </div>
          )}

          {/* Mobile close button */}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className={[
              'md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors',
              isCollapsed ? 'hidden' : '',
            ].join(' ')}
            style={{ flexShrink: 0 }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 4 4 12M4 4l8 8"/>
            </svg>
          </button>
        </div>

        {/* ── Nav links ── */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {nav.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={[
                  'flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                  isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5',
                  active ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200',
                ].join(' ')}
                style={active ? { background: 'rgba(59,130,246,0.15)' } : undefined}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '' }}
              >
                <span className={isCollapsed ? 'text-xl' : 'text-base'}>{item.icon}</span>

                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#3B82F6' }} />}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── Bottom: user + sign-out + desktop collapse toggle ── */}
        <div className="shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Avatar + name */}
          <div className={['flex items-center gap-3 px-3 py-3', isCollapsed ? 'justify-center' : ''].join(' ')}>
            <div
              title={isCollapsed ? userName : undefined}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
            >
              {(userName[0] ?? '?').toUpperCase()}
            </div>
            {!isCollapsed && (
              <p className="text-xs font-medium text-slate-400 truncate flex-1">{userName}</p>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Sign out' : undefined}
            className={[
              'w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-slate-500 hover:text-red-400 transition-colors',
              isCollapsed ? 'justify-center' : '',
            ].join(' ')}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            {/* Door-arrow icon */}
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            {!isCollapsed && 'Sign out'}
          </button>

          {/* Desktop-only collapse toggle */}
          <button
            onClick={() => setIsCollapsed(c => !c)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex w-full items-center justify-center py-3 text-slate-600 hover:text-slate-300 transition-colors"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <svg
              width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 300ms ease' }}
            >
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </div>
      </aside>
    </>
  )
}
