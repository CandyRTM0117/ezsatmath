import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STAT_CONFIG = [
  { key: 'solvedToday',    label: 'Solved Today',      icon: '⚡', from: '#3B82F6', to: '#1D4ED8' },
  { key: 'totalAttempts',  label: 'Total Problems',     icon: '📝', from: '#8B5CF6', to: '#6D28D9' },
  { key: 'accuracy',       label: 'Accuracy',           icon: '🎯', from: '#10B981', to: '#059669' },
  { key: 'examsCount',     label: 'Exams Taken',        icon: '📋', from: '#F59E0B', to: '#D97706' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

  const today = new Date().toISOString().split('T')[0]

  const [
    { count: solvedToday },
    { count: totalAttempts },
    { count: correctAttempts },
    { data: exams },
  ] = await Promise.all([
    supabase.from('problem_attempts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('attempted_at', today),
    supabase.from('problem_attempts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('problem_attempts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_correct', true),
    supabase.from('exams').select('*').eq('user_id', user.id).order('taken_at', { ascending: false }).limit(5),
  ])

  const accuracy = totalAttempts ? Math.round((correctAttempts ?? 0) / totalAttempts * 100) : 0

  const statValues: Record<string, string | number> = {
    solvedToday: solvedToday ?? 0,
    totalAttempts: totalAttempts ?? 0,
    accuracy: `${accuracy}%`,
    examsCount: exams?.length ?? 0,
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome back, {profile?.name ?? 'Student'} 👋
        </h1>
        <p className="text-slate-500 mt-1.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {STAT_CONFIG.map(s => (
          <div key={s.key} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:-translate-y-1 transition-transform duration-200">
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${s.from}, ${s.to})` }} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <p className="text-4xl font-extrabold tracking-tight" style={{ color: s.from }}>
                {statValues[s.key]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent exams */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-extrabold text-slate-900 text-lg">Recent Exams</h2>
            <Link href="/student/exam" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
              Take exam →
            </Link>
          </div>
          {exams && exams.length > 0 ? (
            <div className="space-y-3">
              {exams.map(e => {
                const pct = Math.round(e.score / e.total * 100)
                return (
                  <div key={e.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">Part {e.part}</span>
                      <span className="text-xs text-slate-400 ml-2">{new Date(e.taken_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 bg-slate-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444' }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-12 text-right ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {e.score}/{e.total}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm mb-3">No exams taken yet.</p>
              <Link
                href="/student/exam"
                className="inline-block px-5 py-2.5 text-sm font-bold text-white rounded-full transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
              >
                Take your first exam →
              </Link>
            </div>
          )}
        </div>

        {/* Account info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-extrabold text-slate-900 text-lg mb-5">Account Info</h2>
          <div className="space-y-4">
            {[
              { label: 'Name', value: profile?.name ?? '—' },
              { label: 'Email', value: profile?.email ?? '—' },
              { label: 'Joined', value: new Date(profile?.created_at).toLocaleDateString() },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest w-14 shrink-0">{row.label}</span>
                <span className="text-sm font-medium text-slate-800 truncate">{row.value}</span>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest w-14 shrink-0">Plan</span>
              {profile?.is_subscribed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full text-blue-700"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)' }}>
                  ✦ Pro
                </span>
              ) : (
                <Link href="/student/subscription"
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-colors">
                  Free · Upgrade →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
