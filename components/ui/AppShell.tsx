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

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })
    function onVisibility() {
      if (document.hidden) return
      supabase.auth.getSession().then(({ data, error }) => {
        if (error || !data.session) router.replace('/login')
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        {children}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar role={role} userName={userName} userId={userId} />

      <main
        className="stage app-main"
        style={{
          position: 'relative', flex: '1 1 0', overflowY: 'auto',
          padding: 'clamp(1rem, 3vw, 3rem)',
        }}
      >
        <div key={pathname} className="fade-in mx-auto" style={{ maxWidth: '80rem', position: 'relative' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
