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

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 border transition-all focus:outline-none min-h-[44px]"
  const inputStyle = { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)' }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F172A' }}>
        <div className="w-full max-w-md rounded-2xl p-10 text-center border"
          style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="text-5xl mb-5">📬</div>
          <h1 className="text-2xl font-extrabold text-white mb-3">Check your email</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to activate your account.
          </p>
          <p className="text-xs text-slate-600 mt-6">
            Already confirmed?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">Log in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#0F172A' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl p-8 border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
          <div className="mb-8 text-center">
            <Link href="/" className="text-3xl font-extrabold tracking-tight text-white">
              Ez<span className="text-blue-400">SAT</span>
            </Link>
            <p className="text-slate-400 mt-2">Create your account</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {[
              { label: 'Full name',        type: 'text',     value: name,     set: setName,     ph: 'Jane Smith' },
              { label: 'Email',            type: 'email',    value: email,    set: setEmail,    ph: 'you@example.com' },
              { label: 'Password',         type: 'password', value: password, set: setPassword, ph: 'Min. 6 characters' },
              { label: 'Confirm password', type: 'password', value: confirm,  set: setConfirm,  ph: '••••••••' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">{f.label}</label>
                <input
                  type={f.type} required value={f.value}
                  onChange={e => f.set(e.target.value)}
                  className={inputClass} style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#3B82F6')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                  placeholder={f.ph}
                />
              </div>
            ))}

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 font-bold text-white rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-60 min-h-[44px] mt-2"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
