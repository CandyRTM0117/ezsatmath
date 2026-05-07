'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
  registerUser: (userId: string) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
  registerUser: () => {},
})

export function useTheme() { return useContext(ThemeContext) }

// Public marketing/auth pages always render dark, regardless of saved pref.
const FORCE_DARK = (path: string) =>
  path === '/' || path === '/login' || path === '/signup'

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('light', t === 'light')
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [userId, setUserId] = useState<string | null>(null)
  const pathname = usePathname() ?? '/'
  const forceDark = FORCE_DARK(pathname)

  // initial mount + react to route changes
  useEffect(() => {
    if (forceDark) {
      applyTheme('dark')
      return
    }
    const key = userId ? `ezsat-theme-${userId}` : 'ezsat-theme'
    const saved = (localStorage.getItem(key) as Theme | null) ?? 'light'
    setThemeState(saved)
    applyTheme(saved)
  }, [userId, forceDark, pathname])

  function registerUser(uid: string) {
    setUserId(uid)
  }

  function toggle() {
    if (forceDark) return // no-op on public pages
    const next = theme === 'dark' ? 'light' : 'dark'
    setThemeState(next)
    const key = userId ? `ezsat-theme-${userId}` : 'ezsat-theme'
    localStorage.setItem(key, next)
    applyTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme: forceDark ? 'dark' : theme, toggle, registerUser }}>
      {children}
    </ThemeContext.Provider>
  )
}
