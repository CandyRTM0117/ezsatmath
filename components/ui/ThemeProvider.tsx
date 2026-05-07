'use client'

import { createContext, useContext, useEffect } from 'react'

interface ThemeContextValue {
  theme: 'dark'
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
  useEffect(() => {
    document.documentElement.classList.remove('light')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggle: () => {}, registerUser: () => {} }}>
      {children}
    </ThemeContext.Provider>
  )
}
