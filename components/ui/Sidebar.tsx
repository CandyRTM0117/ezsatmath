'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, ClipboardList, LineChart, CreditCard,
  Users, ListChecks, LogOut, ChevronLeft, Menu, X, Bookmark,
  MessageSquare, Loader2, UserCircle, Star, type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NavItem { href: string; label: string; Icon: LucideIcon }

interface SidebarProps {
  role: 'admin' | 'student' | 'teacher'
  userName: string
  userId: string
}

const adminNav: NavItem[] = [
  { href: '/admin/users',      label: 'Users',        Icon: Users },
  { href: '/admin/problems',   label: 'Problems',     Icon: FileText },
  { href: '/admin/exams',      label: 'Exam Tracker', Icon: ListChecks },
  { href: '/admin/messages',   label: 'Messages',     Icon: MessageSquare },
  { href: '/admin/analytics',  label: 'Analytics',    Icon: LineChart },
  { href: '/admin/reviews',    label: 'Reviews',      Icon: Star },
]
const studentNav: NavItem[] = [
  { href: '/student/dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/student/problems',     label: 'Problems',     Icon: FileText },
  { href: '/student/exam',         label: 'Exam',         Icon: ClipboardList },
  { href: '/student/analytics',    label: 'Analytics',    Icon: LineChart },
  { href: '/student/bookmarks',    label: 'Bookmarks',    Icon: Bookmark },
  { href: '/student/messages',     label: 'Messages',     Icon: MessageSquare },
  { href: '/student/subscription', label: 'Subscription', Icon: CreditCard },
  { href: '/student/review',       label: 'Review',       Icon: Star },
]
const teacherNav: NavItem[] = [
  { href: '/teacher/problems',  label: 'Problems', Icon: FileText },
  { href: '/teacher/students',  label: 'Students', Icon: Users },
  { href: '/teacher/messages',  label: 'Messages', Icon: MessageSquare },
  { href: '/teacher/account',   label: 'Account',  Icon: UserCircle },
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
  const nav = getNav(role)
  const activePath = optimisticHref && !pathname.startsWith(optimisticHref) ? optimisticHref : pathname
  const navigatingHref = optimisticHref && !pathname.startsWith(optimisticHref) ? optimisticHref : null
  const supabaseRef = useRef(createClient())

  const messagesHref = nav.find(item => item.href.includes('messages'))?.href ?? null

  useEffect(() => { setOptimisticHref(null) }, [pathname])

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
    window.location.href = '/login'
  }

  // Desktop: flex item (relative). Mobile: fixed drawer that slides in.
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  const sidebarStyle: React.CSSProperties = {
    width: isCollapsed ? '5rem' : '14rem',
    transition: 'transform 0.3s var(--ease), width 0.3s var(--ease)',
    display: 'flex', flexDirection: 'column',
    flexShrink: 0,
    // mobile-only positioning via CSS class below; inline only handles transform when open
    transform: isOpen ? 'translateX(0)' : undefined,
  }
  // Tag the aside so CSS can apply fixed/relative per breakpoint without inline mediaqueries
  void isDesktop

  return (
    <>
      {/* Mobile hamburger — hidden on desktop via .mobile-only (defined after .btn in CSS) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="mobile-only btn"
          style={{ position: 'fixed', top: '1rem', left: '1rem', zIndex: 50, width: '2.6rem', height: '2.6rem', padding: 0 }}
        >
          <Menu size={18} strokeWidth={2} />
        </button>
      )}

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="c-modal-backdrop mobile-only fade-in"
          style={{ position: 'fixed', inset: 0, zIndex: 30 }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className="c-sidebar"
        data-open={isOpen}
        style={sidebarStyle}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between" style={{ padding: '1.1rem 1rem', borderBottom: '1px solid var(--glass-border)' }}>
          {isCollapsed ? (
            <span className="text-lg font-extrabold mx-auto" style={{
              background: 'linear-gradient(135deg, var(--text-1), var(--accent-violet))',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Ez</span>
          ) : (
            <div>
              <h1 className="text-xl font-extrabold tracking-tight whitespace-nowrap" style={{ margin: 0 }}>
                Ez<span style={{ color: 'var(--accent-violet)' }}>SAT</span>
              </h1>
              <p className="text-xs uppercase tracking-widest font-semibold mt-1" style={{ color: 'var(--text-3)' }}>
                {role}
              </p>
            </div>
          )}
          {isOpen && !isCollapsed && (
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
              className="mobile-only btn btn-ghost"
              style={{ padding: '0.4rem', borderRadius: 'var(--r-sm)' }}
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto stack" style={{ padding: '1rem 0.75rem', gap: '0.25rem' }}>
          {nav.map(item => {
            const active = activePath.startsWith(item.href)
            const isNavigating = navigatingHref === item.href
            const { Icon } = item
            const isMessages = item.href.includes('messages')
            const showBadge = isMessages && unreadCount > 0
            const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount)
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => { setIsOpen(false); setOptimisticHref(item.href) }}
                title={isCollapsed ? item.label : undefined}
                className="c-nav-item"
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : '0.75rem',
                  padding: isCollapsed ? '0.7rem 0' : '0.6rem 0.85rem',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  fontSize: '0.875rem', fontWeight: 500,
                  color: active ? 'var(--text-1)' : 'var(--text-2)',
                  position: 'relative',
                }}
              >
                {active && !isCollapsed && (
                  <span style={{
                    position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
                    borderRadius: '0 4px 4px 0',
                    background: 'linear-gradient(180deg, var(--accent-cyan), var(--accent-violet))',
                  }} />
                )}
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                  {isNavigating
                    ? <Loader2 size={isCollapsed ? 22 : 18} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
                    : <Icon size={isCollapsed ? 22 : 18} strokeWidth={1.75} style={{ color: active ? 'var(--accent-pearl)' : 'currentColor' }} />}
                  {showBadge && isCollapsed && !isNavigating && (
                    <span style={{
                      position: 'absolute', top: -6, right: -8,
                      minWidth: 16, height: 16, padding: '0 4px',
                      borderRadius: 999, fontSize: 9, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', background: 'var(--danger)',
                      boxShadow: '0 0 8px rgba(248,113,113,0.5)',
                    }}>{badgeLabel}</span>
                  )}
                </span>
                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {isNavigating ? (
                      <span className="text-xs" style={{ color: 'var(--accent-cyan)', opacity: 0.8 }}>Loading…</span>
                    ) : showBadge ? (
                      <span style={{
                        minWidth: 18, height: 18, padding: '0 5px',
                        borderRadius: 999, fontSize: 10, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', background: 'var(--danger)',
                        boxShadow: '0 0 8px rgba(248,113,113,0.4)',
                      }}>{badgeLabel}</span>
                    ) : active ? (
                      <span style={{
                        width: 6, height: 6, borderRadius: 999,
                        background: 'var(--accent-cyan)', boxShadow: 'var(--glow-cyan)',
                      }} />
                    ) : null}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer: user + sign out + collapse */}
        <div style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-3" style={{ padding: '0.75rem 1rem', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            <div
              title={isCollapsed ? userName : undefined}
              style={{
                width: 32, height: 32, borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#0B0F25', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent-pearl), var(--accent-violet))',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.18), 0 4px 12px rgba(139,92,246,0.35)',
              }}
            >
              {(userName[0] ?? '?').toUpperCase()}
            </div>
            {!isCollapsed && <p className="text-xs font-semibold truncate flex-1" style={{ color: 'var(--text-2)', margin: 0 }}>{userName}</p>}
          </div>

          <button
            onClick={handleLogout}
            disabled={signingOut}
            title={isCollapsed ? 'Sign out' : undefined}
            className="w-full flex items-center gap-2 transition-colors"
            style={{
              padding: '0.7rem 1rem',
              fontSize: 12, fontWeight: 600,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              color: 'var(--text-3)',
              background: 'transparent',
              border: 'none', cursor: signingOut ? 'not-allowed' : 'pointer',
              opacity: signingOut ? 0.5 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.color = 'var(--danger)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
          >
            {signingOut
              ? <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              : <LogOut size={14} strokeWidth={1.75} />}
            {!isCollapsed && (signingOut ? 'Signing out…' : 'Sign out')}
          </button>

          <button
            onClick={() => setIsCollapsed(c => !c)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex w-full items-center justify-center transition-colors"
            style={{
              padding: '0.75rem 0',
              color: 'var(--text-3)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderTop: '1px solid var(--glass-border)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronLeft
              size={14} strokeWidth={2}
              style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s var(--ease)' }}
            />
          </button>
        </div>
      </aside>

    </>
  )
}
