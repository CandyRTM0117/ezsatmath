'use client'

import { useState } from 'react'
import { Plus, X, Loader2, Crown, ShieldOff, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Dropdown from '@/components/ui/Dropdown'
import type { User } from '@/types'

const inputStyle: React.CSSProperties = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--input-color)',
}

export default function UsersClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' as 'admin' | 'student' | 'teacher' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [subLoading, setSubLoading] = useState<string | null>(null)

  const supabase = createClient()

  async function reload() {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setUsers(data ?? [])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed'); setLoading(false); return }
    await reload()
    setShowAdd(false)
    setForm({ name: '', email: '', password: '', role: 'student' })
    setLoading(false)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setError('')
    setLoading(true)
    const { error: err } = await supabase
      .from('users')
      .update({ name: form.name, role: form.role })
      .eq('id', editUser.id)
    if (err) { setError(err.message); setLoading(false); return }
    await reload()
    setEditUser(null)
    setLoading(false)
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete ${user.name ?? user.email}? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' })
    if (res.ok) await reload()
  }

  async function handleSubscription(userId: string, action: 'upgrade' | 'downgrade' | 'extend') {
    setSubLoading(userId + action)
    const res = await fetch('/api/admin/subscription', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    })
    if (res.ok) await reload()
    setSubLoading(null)
  }

  function openEdit(user: User) {
    setEditUser(user)
    setForm({ name: user.name ?? '', email: user.email, password: '', role: user.role })
    setError('')
  }

  const closeModal = () => { setShowAdd(false); setEditUser(null) }

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function isExpired(d: string | null) {
    if (!d) return false
    return new Date(d) < new Date()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Users
        </h1>
        <button
          onClick={() => { setShowAdd(true); setEditUser(null); setForm({ name: '', email: '', password: '', role: 'student' }); setError('') }}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}
        >
          <Plus size={14} strokeWidth={2.5} /> Add User
        </button>
      </div>

      {(showAdd || editUser) && (
        <div className="c-modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4 fade-in" onClick={closeModal}>
          <div
            className="c-modal rounded-2xl w-full max-w-md p-7 zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-extrabold text-white tracking-tight">{editUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <form onSubmit={editUser ? handleUpdate : handleAdd} className="space-y-3">
              <input
                className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
                style={inputStyle}
                placeholder="Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
              />
              {!editUser && (
                <>
                  <input
                    type="email"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
                    style={inputStyle}
                    placeholder="Email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
                  />
                  <input
                    type="password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
                    style={inputStyle}
                    placeholder="Password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
                  />
                </>
              )}
              <Dropdown
                value={form.role}
                onChange={v => setForm(f => ({ ...f, role: v as 'admin' | 'student' | 'teacher' }))}
                options={[
                  { value: 'student', label: 'Student' },
                  { value: 'teacher', label: 'Teacher' },
                  { value: 'admin', label: 'Admin' },
                ]}
                className="w-full"
              />
              {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 font-bold text-white rounded-full text-sm transition-all duration-200 disabled:opacity-50 hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 20px rgba(59,130,246,0.35)' }}
                >
                  {loading ? (<span className="inline-flex items-center justify-center gap-2"><Loader2 size={12} className="animate-spin" /> Saving…</span>) : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-slate-200 transition-all"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--input-textarea-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--input-bg)')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="c-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--table-header-border)' }}>
              <tr>
                <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Name</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Email</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Role</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Plan</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Valid Until</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Joined</th>
                <th className="px-5 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const expired = u.is_subscribed && isExpired(u.subscription_valid_until)
                return (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-semibold text-white">{u.name ?? '—'}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{u.email}</td>
                    <td className="px-5 py-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
                        style={u.role === 'admin'
                          ? { background: 'rgba(168,85,247,0.12)', color: '#C4B5FD', border: '1px solid rgba(168,85,247,0.25)' }
                          : { background: 'rgba(59,130,246,0.12)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.25)' }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {u.is_subscribed ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={expired
                            ? { background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }
                            : { background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}
                        >
                          <Crown size={11} strokeWidth={2} />
                          {expired ? 'Pro (expired)' : 'Pro'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-400" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          Free
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {u.subscription_valid_until ? (
                        <span style={{ color: expired ? '#F87171' : '#94A3B8' }}>
                          {fmtDate(u.subscription_valid_until)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        {u.is_subscribed ? (
                          <>
                            <button
                              onClick={() => handleSubscription(u.id, 'extend')}
                              disabled={subLoading === u.id + 'extend'}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded-lg disabled:opacity-50"
                              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
                              title="Extend by 30 days"
                            >
                              {subLoading === u.id + 'extend' ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} strokeWidth={2} />}
                              +30d
                            </button>
                            <button
                              onClick={() => handleSubscription(u.id, 'downgrade')}
                              disabled={subLoading === u.id + 'downgrade'}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg disabled:opacity-50"
                              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                              title="Downgrade to Free"
                            >
                              {subLoading === u.id + 'downgrade' ? <Loader2 size={11} className="animate-spin" /> : <ShieldOff size={11} strokeWidth={2} />}
                              Free
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleSubscription(u.id, 'upgrade')}
                            disabled={subLoading === u.id + 'upgrade'}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1 rounded-lg disabled:opacity-50"
                            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
                            title="Upgrade to Pro (30 days)"
                          >
                            {subLoading === u.id + 'upgrade' ? <Loader2 size={11} className="animate-spin" /> : <Crown size={11} strokeWidth={2} />}
                            Pro
                          </button>
                        )}
                        <button onClick={() => openEdit(u)} className="text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors">Edit</button>
                        <button onClick={() => handleDelete(u)} className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
