'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-white">
          Ez<span className="text-blue-400">SAT</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-bold text-white px-5 py-2.5 rounded-full transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
          >
            Get started →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(o => !o)}
          className="md:hidden p-2 text-slate-300 hover:text-white rounded-xl transition-colors"
          aria-label="Toggle menu"
        >
          {open ? (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '200px' : '0', borderTop: open ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
      >
        <div className="px-6 py-4 space-y-2" style={{ background: 'rgba(15,23,42,0.97)' }}>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-3 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center px-4 py-3 text-white font-bold rounded-xl text-sm transition-all"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
          >
            Get started →
          </Link>
        </div>
      </div>
    </header>
  )
}
