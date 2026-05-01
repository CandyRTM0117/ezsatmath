'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'

  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest w-16 shrink-0">Theme</span>
      <button
        onClick={toggle}
        title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        className="relative w-12 h-6 rounded-full transition-all duration-300 flex items-center"
        style={{
          background: isLight ? '#1E293B' : 'rgba(255,255,255,0.12)',
          border: isLight ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <span
          className="absolute w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 shadow-md"
          style={{
            left: isLight ? '25px' : '2px',
            background: isLight ? '#FFFFFF' : '#1E293B',
          }}
        >
          {isLight
            ? <Sun size={11} strokeWidth={2} style={{ color: '#F59E0B' }} />
            : <Moon size={11} strokeWidth={2} style={{ color: '#94A3B8' }} />}
        </span>
      </button>
      <span className="text-xs font-medium text-slate-400">{isLight ? 'Light' : 'Dark'}</span>
    </div>
  )
}
