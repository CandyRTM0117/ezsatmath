'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface DropdownProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  className?: string
}

export default function Dropdown({ value, onChange, options, className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const current = options.find(o => o.value === value)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap select-none min-w-[10rem]"
        style={{
          background: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          color: 'var(--text-1)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-bg-hi)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--input-bg)')}
      >
        <span>{current?.label ?? 'Select'}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className="shrink-0 transition-transform duration-200"
          style={{ color: 'var(--text-3)' }}
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      <div
        className="absolute top-full left-0 z-30 mt-2 min-w-full overflow-hidden rounded-xl shadow-2xl shadow-black/20"
        style={{
          background: 'var(--app-bg-alt)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--card-border)',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 150ms ease, transform 150ms ease',
          transformOrigin: 'top left',
        }}
      >
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { onChange(opt.value); setOpen(false) }}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors font-medium ${i > 0 ? 'border-t' : ''}`}
            style={{
              color: value === opt.value ? 'var(--accent-cyan)' : 'var(--text-2)',
              background: value === opt.value ? 'rgba(34,211,238,0.10)' : undefined,
              borderColor: 'var(--glass-border)',
            }}
            onMouseEnter={e => {
              if (value !== opt.value) {
                (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg-hi)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-1)'
              }
            }}
            onMouseLeave={e => {
              if (value !== opt.value) {
                (e.currentTarget as HTMLElement).style.background = ''
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
              }
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
