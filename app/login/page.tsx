'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Login failed'); setLoading(false); return }

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    router.push(profile?.role === 'admin' ? '/admin/users' : '/student/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 stage">
      <div className="w-full" style={{ maxWidth: '26rem' }}>
        <div className="card">
          <div className="text-center mb-8">
            <Link href="/" className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>
              Ez<span style={{ color: 'var(--accent-violet)' }}>SAT</span>
            </Link>
            <p className="mt-2" style={{ color: 'var(--text-2)' }}>Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="stack" style={{ gap: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@example.com" />
            </div>
            <div className="field">
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="current-password" required value={password}
                onChange={e => setPassword(e.target.value)}
                className="input" placeholder="••••••••" />
            </div>

            {error && (
              <p className="text-sm text-red-400 px-4 py-3 rounded-md"
                 style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.35)' }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2"
              style={{ padding: '0.9rem 1.3rem', opacity: loading ? 0.6 : 1 }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin" style={{
                    width: 16, height: 16, borderRadius: 999,
                    border: '2px solid rgba(11,15,37,0.25)', borderTopColor: '#0B0F25', display: 'inline-block',
                  }} />
                  Signing in…
                </span>
              ) : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
