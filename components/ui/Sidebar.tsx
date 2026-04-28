'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  href: string
  label: string
  icon: string
}

interface SidebarProps {
  role: 'admin' | 'student'
  userName: string
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

export default function Sidebar({ role, userName }: SidebarProps) {
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
    <aside className="w-56 h-screen sticky top-0 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="px-5 py-6 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900">EzSAT</h1>
        <p className="text-xs text-slate-500 mt-0.5 capitalize">{role}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname.startsWith(item.href)
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-slate-100">
        <p className="text-xs text-slate-500 truncate mb-2">{userName}</p>
        <button
          onClick={handleLogout}
          className="text-xs text-slate-500 hover:text-red-600 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
