'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import { useTheme } from './ThemeProvider'
import { useLang } from './LanguageProvider'
import { createClient } from '@/lib/supabase/client'

interface AppShellProps {
  role: 'admin' | 'student' | 'teacher'
  userName: string
  userId: string
  preferredLanguage?: 'en' | 'mn'
  children: React.ReactNode
}

export default function AppShell({ role, userName, userId, preferredLanguage = 'en', children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { registerUser } = useTheme()
  const { registerUser: registerLang } = useLang()

  useEffect(() => {
    registerUser(userId)
    registerLang(userId, preferredLanguage)
  }, [userId])

  // Redirect to login if the Supabase session expires or is signed out
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login')
      }
    })

    // Re-validate session when tab becomes active after being hidden
    function onVisibility() {
      if (document.hidden) return
      supabase.auth.getSession().then(({ data, error }) => {
        if (error || !data.session) {
          router.replace('/login')
        }
      })
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const isFullscreen = /\/problems\/[^/]+$/.test(pathname)

  if (isFullscreen) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: 'var(--app-bg)' }}>
        {children}
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      <Sidebar role={role} userName={userName} userId={userId} />

      <main className="app-main relative flex-1 overflow-y-auto pt-20 px-4 pb-8 md:p-8 lg:p-12"
        style={{ background: 'var(--app-bg)' }}>
        <div
          className="pointer-events-none absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(closest-side, rgba(59,130,246,0.18), transparent)', filter: 'blur(60px)' }}
        />
        <div
          className="pointer-events-none absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.18), transparent)', filter: 'blur(80px)' }}
        />

        <div key={pathname} className="relative max-w-7xl mx-auto fade-in-up">
          {children}
        </div>
      </main>
    </div>
  )
}
