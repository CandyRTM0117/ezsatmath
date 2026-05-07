'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-50 u-glass"
      style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>
          Ez<span style={{ color: 'var(--accent-violet)' }}>SAT</span>
        </Link>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="btn btn-ghost text-sm">Log in</Link>
          <Link href="/signup" className="btn btn-primary text-sm">Get started →</Link>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="btn btn-ghost md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      <div
        className="md:hidden overflow-hidden transition"
        style={{ maxHeight: open ? '220px' : 0 }}
      >
        <div className="px-6 py-4 stack" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost w-full">Log in</Link>
          <Link href="/signup" onClick={() => setOpen(false)} className="btn btn-primary w-full">Get started →</Link>
        </div>
      </div>
    </header>
  )
}
