'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NavItem { href: string; label: string; icon: string }

interface SidebarProps {
  role: 'admin' | 'student'
  userName: string
  isOpen?: boolean
  onClose?: () => void
}

const adminNav: NavItem[] = [
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/problems', label: 'Problems', icon: '📝' },
  { href: '/admin/exams', label: 'Exam Tracker', icon: '📊' },
]

const studentNav: NavItem[] = [
  { href: '/student/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/student/problems', label: 'Problems', icon: '📝' },
  { href: '/student/exam', label: 'Exam', icon: '📋' },
  { href: '/student/analytics', label: 'Analytics', icon: '📈' },
  { href: '/student/subscription', label: 'Subscription', icon: '💳' },
]

export default function Sidebar({ role, userName, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = role === 'admin' ? adminNav : studentNav

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="fixed md:relative inset-y-0 left-0 z-30 flex flex-col shrink-0 border-r transition-transform duration-300 ease-in-out md:translate-x-0"
      style={{
        width: '240px',
        height: '100%',
        background: '#0F172A',
        borderColor: 'rgba(255,255,255,0.06)',
        transform: isOpen ? 'translateX(0)' : undefined,
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Ez<span className="text-blue-400">SAT</span>
          </h1>
          <p className="text-xs font-medium mt-0.5 capitalize" style={{ color: 'rgba(148,163,184,0.7)' }}>{role}</p>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          aria-label="Close menu"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 4 4 12M4 4l8 8"/>
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={active ? {
                background: 'rgba(59,130,246,0.18)',
                color: '#60A5FA',
              } : {
                color: 'rgba(148,163,184,0.9)',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '' }}
            >
              {active && (
                <span
                  className="absolute left-0 w-1 rounded-r-full"
                  style={{ height: '28px', background: '#3B82F6' }}
                />
              )}
              <span className="text-base">{item.icon}</span>
              {item.label}
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: '#3B82F6' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
          >
            {(userName[0] ?? '?').toUpperCase()}
          </div>
          <p className="text-xs font-medium text-slate-300 truncate flex-1">{userName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs font-medium px-3 py-2 rounded-lg transition-colors text-slate-500 hover:text-red-400 hover:bg-white/5"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
