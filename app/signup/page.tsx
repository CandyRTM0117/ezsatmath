'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { name }, emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (authError) { setError(authError.message); setLoading(false); return }
    setDone(true); setLoading(false)
  }

  if (done) {
    return (
<div className="min-h-screen flex items-center justify-center px-4">
        <div className="card w-full text-center" style={{ maxWidth: '26rem' }}>
          <div className="text-5xl mb-5" style={{ transform: 'translateZ(40px)' }}>📬</div>
          <h3 className="card-title text-2xl">Check your email</h3>
          <p className="card-body text-sm">
            We sent a confirmation link to <strong style={{ color: 'var(--text-1)' }}>{email}</strong>. Click it to activate your account.
          </p>
          <p className="text-xs text-slate-500 mt-6">
            Already confirmed?{' '}
            <Link href="/login" style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>Log in</Link>
          </p>
        </div>
      </div>
    )
  }

  const fields = [
    { label: 'Full name',        type: 'text',     value: name,     set: setName,     ph: 'Jane Smith',        ac: 'name' },
    { label: 'Email',            type: 'email',    value: email,    set: setEmail,    ph: 'you@example.com',   ac: 'email' },
    { label: 'Password',         type: 'password', value: password, set: setPassword, ph: 'Min. 6 characters', ac: 'new-password' },
    { label: 'Confirm password', type: 'password', value: confirm,  set: setConfirm,  ph: '••••••••',          ac: 'new-password' },
  ]

  return (
  <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full" style={{ maxWidth: '26rem' }}>
        <div className="card">
          <div className="text-center mb-8">
            <Link href="/" className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>
              Ez<span style={{ color: 'var(--accent-violet)' }}>SAT</span>
            </Link>
            <p className="mt-2" style={{ color: 'var(--text-2)' }}>Create your account</p>
          </div>

          <form onSubmit={handleSignup} className="stack" style={{ gap: '1rem' }}>
            {fields.map(f => (
              <div key={f.label} className="field">
                <label className="label">{f.label}</label>
                <input type={f.type} autoComplete={f.ac} required value={f.value}
                  onChange={e => f.set(e.target.value)}
                  className="input" placeholder={f.ph} />
              </div>
            ))}

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
                  Creating account…
                </span>
              ) : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
