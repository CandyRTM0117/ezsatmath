'use client'

import { createContext, useContext, useEffect, useState } from 'react'

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

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (userId) return
    const saved = localStorage.getItem('ezsat-theme') as Theme | null
    if (saved === 'light') {
      setThemeState('light')
      document.documentElement.classList.add('light')
    }
  }, [userId])

  function registerUser(uid: string) {
    setUserId(uid)
    const saved = localStorage.getItem(`ezsat-theme-${uid}`) as Theme | null
    const next = saved ?? 'dark'
    setThemeState(next)
    document.documentElement.classList.toggle('light', next === 'light')
  }

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setThemeState(next)
    const key = userId ? `ezsat-theme-${userId}` : 'ezsat-theme'
    localStorage.setItem(key, next)
    document.documentElement.classList.toggle('light', next === 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, registerUser }}>
      {children}
    </ThemeContext.Provider>
  )
}
