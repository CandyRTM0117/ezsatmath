'use client'

import { useState } from 'react'
import { KeyRound, Eye, EyeOff, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--input-color)',
}

export default function ChangePasswordForm({ email }: { email: string }) {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const supabase = createClient()

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { showToast('error', 'New passwords do not match.'); return }
    if (newPw.length < 6) { showToast('error', 'Password must be at least 6 characters.'); return }

    setLoading(true)
    // Verify current password by attempting sign-in
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPw })
    if (signInErr) { showToast('error', 'Current password is incorrect.'); setLoading(false); return }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw })
    if (updateErr) { showToast('error', updateErr.message); setLoading(false); return }

    showToast('success', 'Password updated successfully.')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setLoading(false)
  }

  return (
    <div className="c-card rounded-2xl p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}>
          <KeyRound size={16} strokeWidth={1.75} className="text-blue-300" />
        </div>
        <h2 className="font-extrabold text-white text-lg tracking-tight">Change Password</h2>
      </div>

      {toast && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"
          style={toast.type === 'success'
            ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34D399' }
            : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}
        >
          {toast.type === 'success' ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
          {toast.msg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { label: 'Current password', value: currentPw, set: setCurrentPw, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
          { label: 'New password', value: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(v => !v) },
          { label: 'Confirm new password', value: confirmPw, set: setConfirmPw, show: showNew, toggle: null },
        ].map(({ label, value, set, show, toggle }) => (
          <div key={label} className="relative">
            <input
              type={show ? 'text' : 'password'}
              required
              placeholder={label}
              value={value}
              onChange={e => set(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-all pr-10"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
            />
            {toggle && (
              <button
                type="button"
                onClick={toggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {show ? <EyeOff size={14} strokeWidth={1.75} /> : <Eye size={14} strokeWidth={1.75} />}
              </button>
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 font-bold text-white rounded-full text-sm transition-all duration-200 disabled:opacity-50 hover:scale-[1.01] mt-2"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 20px rgba(59,130,246,0.35)' }}
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
