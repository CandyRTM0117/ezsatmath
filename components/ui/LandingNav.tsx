import Link from 'next/link'

export default function LandingNav() {
  return (
    <header
      className="sticky top-0 z-50 u-glass"
      style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>
          Ez<span style={{ color: 'var(--accent-violet)' }}>SAT</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/login" className="btn btn-ghost text-sm">Log in</Link>
          <Link href="/signup" className="btn btn-primary text-sm">Get started →</Link>
        </div>
      </div>
    </header>
  )
}
