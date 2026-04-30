import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Zap, FileText, Target, ClipboardList, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import ChangePasswordForm from './ChangePasswordForm'

const STAT_CONFIG = [
  { key: 'solvedToday',     label: 'Solved Today',     Icon: Zap,           from: '#60A5FA', to: '#3B82F6' },
  { key: 'problemsTried',   label: 'Problems Tried',   Icon: FileText,      from: '#A78BFA', to: '#7C3AED' },
  { key: 'problemsSolved',  label: 'Problems Solved',  Icon: CheckCircle2,  from: '#34D399', to: '#10B981' },
  { key: 'accuracy',        label: 'Accuracy',         Icon: Target,        from: '#FBBF24', to: '#F59E0B' },
  { key: 'examsCount',      label: 'Exams Taken',      Icon: ClipboardList, from: '#F87171', to: '#EF4444' },
] as const

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
    problemsTried: totalAttempts ?? 0,
    problemsSolved: correctAttempts ?? 0,
    accuracy: `${accuracy}%`,
    examsCount: exams?.length ?? 0,
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Welcome back, {profile?.name ?? 'Student'}
        </h1>
        <p className="text-slate-400 mt-2 text-lg leading-relaxed">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
        {STAT_CONFIG.map(s => {
          const { Icon } = s
          return (
            <div
              key={s.key}
              className="group rounded-2xl p-5 border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                boxShadow: '0 12px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.02) inset',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `linear-gradient(135deg, ${s.from}33, ${s.to}1a)`, border: `1px solid ${s.from}33` }}
                >
                  <Icon size={16} strokeWidth={1.75} style={{ color: s.from }} />
                </div>
              </div>
              <p
                className="text-3xl font-extrabold tracking-tight"
                style={{
                  background: `linear-gradient(135deg, ${s.from}, ${s.to})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {statValues[s.key]}
              </p>
            </div>
          )
        })}
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent exams */}
        <div
          className="rounded-2xl border border-white/10 p-7"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-extrabold text-white text-lg tracking-tight">Recent Exams</h2>
            <Link
              href="/student/exam"
              prefetch={true}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Take exam <ArrowRight size={12} strokeWidth={2.5} />
            </Link>
          </div>
          {exams && exams.length > 0 ? (
            <div className="space-y-3">
              {exams.map(e => {
                const pct = Math.round(e.score / e.total * 100)
                const color = pct >= 80 ? '#34D399' : pct >= 50 ? '#FBBF24' : '#F87171'
                return (
                  <div key={e.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div>
                      <span className="text-sm font-semibold text-slate-200">Part {e.part}</span>
                      <span className="text-xs text-slate-500 ml-2">{new Date(e.taken_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}66` }} />
                      </div>
                      <span className="text-sm font-bold w-14 text-right tabular-nums" style={{ color }}>{e.score}/{e.total}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm mb-4">No exams taken yet.</p>
              <Link
                href="/student/exam"
                prefetch={true}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-full transition-all duration-200 hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 20px rgba(59,130,246,0.35)' }}
              >
                Take your first exam <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            </div>
          )}
        </div>

        {/* Account info */}
        <div className="space-y-6">
          <div
            className="rounded-2xl border border-white/10 p-7"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
          >
            <h2 className="font-extrabold text-white text-lg mb-6 tracking-tight">Account Info</h2>
            <div className="space-y-4">
              {[
                { label: 'Name',   value: profile?.name ?? '—' },
                { label: 'Email',  value: profile?.email ?? '—' },
                { label: 'Joined', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest w-16 shrink-0">{row.label}</span>
                  <span className="text-sm font-medium text-slate-200 truncate">{row.value}</span>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest w-16 shrink-0">Plan</span>
                {profile?.is_subscribed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full text-blue-300" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)' }}>
                    <Sparkles size={12} strokeWidth={1.75} /> Pro
                  </span>
                ) : (
                  <Link href="/student/subscription" prefetch={true} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full text-slate-300 border border-white/15 hover:border-blue-400/40 hover:text-blue-300 transition-all">
                    Free · Upgrade <ArrowRight size={11} strokeWidth={2.5} />
                  </Link>
                )}
              </div>
            </div>
          </div>

          <ChangePasswordForm email={profile?.email ?? user.email ?? ''} />
        </div>
      </div>
    </div>
  )
}
