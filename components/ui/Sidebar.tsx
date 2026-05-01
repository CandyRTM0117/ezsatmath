'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  LineChart,
  CreditCard,
  Users,
  ListChecks,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Bookmark,
  MessageSquare,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NavItem { href: string; label: string; Icon: LucideIcon }

interface SidebarProps {
  role: 'admin' | 'student' | 'teacher'
  userName: string
  userId: string
}

const adminNav: NavItem[] = [
  { href: '/admin/users',    label: 'Users',        Icon: Users },
  { href: '/admin/problems', label: 'Problems',     Icon: FileText },
  { href: '/admin/exams',    label: 'Exam Tracker', Icon: ListChecks },
  { href: '/admin/messages', label: 'Messages',     Icon: MessageSquare },
]

const studentNav: NavItem[] = [
  { href: '/student/dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/student/problems',     label: 'Problems',     Icon: FileText },
  { href: '/student/exam',         label: 'Exam',         Icon: ClipboardList },
  { href: '/student/analytics',    label: 'Analytics',    Icon: LineChart },
  { href: '/student/bookmarks',    label: 'Bookmarks',    Icon: Bookmark },
  { href: '/student/messages',     label: 'Messages',     Icon: MessageSquare },
  { href: '/student/subscription', label: 'Subscription', Icon: CreditCard },
]

const teacherNav: NavItem[] = [
  { href: '/teacher/problems',  label: 'Problems', Icon: FileText },
  { href: '/teacher/messages',  label: 'Messages', Icon: MessageSquare },
]

function getNav(role: SidebarProps['role']) {
  if (role === 'admin') return adminNav
  if (role === 'teacher') return teacherNav
  return studentNav
}

export default function Sidebar({ role, userName, userId }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const nav = getNav(role)
  const activePath = optimisticHref && !pathname.startsWith(optimisticHref) ? optimisticHref : pathname
  const supabaseRef = useRef(createClient())

  const messagesHref = nav.find(item => item.href.includes('messages'))?.href ?? null

  useEffect(() => {
    if (!messagesHref) return
    const lastSeenKey = `msgs_last_seen_${userId}`

    if (pathname.startsWith(messagesHref)) {
      localStorage.setItem(lastSeenKey, new Date().toISOString())
      setUnreadCount(0)
      return
    }

    async function checkUnread() {
      const lastSeen = localStorage.getItem(lastSeenKey) ?? new Date(0).toISOString()
      const { count } = await supabaseRef.current
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .gt('created_at', lastSeen)
      setUnreadCount(count ?? 0)
    }

    checkUnread()
    const interval = setInterval(checkUnread, 30000)
    return () => clearInterval(interval)
  }, [userId, messagesHref, pathname])

  async function handleLogout() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile hamburger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
          style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Menu size={18} strokeWidth={2} className="text-white" />
        </button>
      )}

      {/* Mobile backdrop */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-30 fade-in" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed md:relative inset-y-0 left-0 z-40',
          'h-full flex flex-col shrink-0',
          'transition-all duration-300 ease-in-out',
          'w-56',
          isCollapsed ? 'md:w-20' : 'md:w-60',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{
          background: 'linear-gradient(180deg, var(--sidebar-bg-start) 0%, var(--sidebar-bg-end) 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between px-4 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {isCollapsed ? (
            <span className="text-lg font-extrabold mx-auto select-none bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">Ez</span>
          ) : (
            <div className="overflow-hidden">
              <h1 className="text-xl font-extrabold tracking-tight whitespace-nowrap">
                <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">Ez</span>
                <span className="text-blue-400">SAT</span>
              </h1>
              <p className="text-[11px] font-semibold mt-0.5 capitalize whitespace-nowrap tracking-widest uppercase"
                style={{ color: 'rgba(148,163,184,0.55)' }}>
                {role}
              </p>
            </div>
          )}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className={['md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200', isCollapsed ? 'hidden' : ''].join(' ')}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {nav.map(item => {
            const active = activePath.startsWith(item.href)
            const { Icon } = item
            const isMessages = item.href.includes('messages')
            const showBadge = isMessages && unreadCount > 0
            const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount)
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => { setIsOpen(false); setOptimisticHref(item.href) }}
                title={isCollapsed ? item.label : undefined}
                className={[
                  'group flex items-center rounded-xl text-sm font-semibold transition-all duration-200 relative',
                  isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5',
                  active ? 'text-white' : 'text-slate-400 hover:text-white',
                ].join(' ')}
                style={active ? { background: 'linear-gradient(90deg, rgba(59,130,246,0.18), rgba(59,130,246,0.08))', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.25)' } : undefined}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '' }}
              >
                {active && !isCollapsed && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full" style={{ background: 'linear-gradient(180deg, #60A5FA, #3B82F6)' }} />
                )}
                <div className="relative shrink-0">
                  <Icon
                    size={isCollapsed ? 22 : 18}
                    strokeWidth={1.75}
                    className={active ? 'text-blue-300' : 'text-slate-400 group-hover:text-slate-200 transition-colors'}
                  />
                  {showBadge && isCollapsed && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                      style={{ background: '#EF4444', boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}
                    >
                      {badgeLabel}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {showBadge ? (
                      <span
                        className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                        style={{ background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.4)' }}
                      >
                        {badgeLabel}
                      </span>
                    ) : active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#60A5FA', boxShadow: '0 0 8px #60A5FA' }} />
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: user + sign-out + collapse toggle */}
        <div className="shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className={['flex items-center gap-3 px-3 py-3', isCollapsed ? 'justify-center' : ''].join(' ')}>
            <div
              title={isCollapsed ? userName : undefined}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #60A5FA, #1D4ED8)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 4px 12px rgba(59,130,246,0.3)' }}
            >
              {(userName[0] ?? '?').toUpperCase()}
            </div>
            {!isCollapsed && <p className="text-xs font-semibold text-slate-300 truncate flex-1">{userName}</p>}
          </div>

          <button
            onClick={handleLogout}
            disabled={signingOut}
            title={isCollapsed ? 'Sign out' : undefined}
            className={['w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-red-400 transition-all duration-200 disabled:opacity-50', isCollapsed ? 'justify-center' : ''].join(' ')}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            {signingOut
              ? <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              : <LogOut size={14} strokeWidth={1.75} />}
            {!isCollapsed && (signingOut ? 'Signing out…' : 'Sign out')}
          </button>

          <button
            onClick={() => setIsCollapsed(c => !c)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex w-full items-center justify-center py-3 text-slate-600 hover:text-slate-300 transition-all duration-200"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <ChevronLeft
              size={14}
              strokeWidth={2}
              style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 300ms ease' }}
            />
          </button>
        </div>
      </aside>
    </>
  )
}
