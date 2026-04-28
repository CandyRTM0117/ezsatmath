'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export default function UsersClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' as 'admin' | 'student' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  function openEdit(user: User) {
    setEditUser(user)
    setForm({ name: user.name ?? '', email: user.email, password: '', role: user.role })
    setError('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <button
          onClick={() => { setShowAdd(true); setEditUser(null); setForm({ name: '', email: '', password: '', role: 'student' }); setError('') }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
        >
          + Add User
        </button>
      </div>

      {(showAdd || editUser) && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editUser ? 'Edit User' : 'Add User'}</h2>
            <form onSubmit={editUser ? handleUpdate : handleAdd} className="space-y-3">
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              {!editUser && (
                <>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                  <input
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                </>
              )}
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'student' }))}
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={loading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {loading ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => { setShowAdd(false); setEditUser(null) }}
                  className="flex-1 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{u.name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 flex gap-2 justify-end">
                  <button onClick={() => openEdit(u)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => handleDelete(u)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No users yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
