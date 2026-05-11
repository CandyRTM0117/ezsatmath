'use client'

import { useState } from 'react'
import { Search, ArrowLeft, Loader2, CheckCircle, XCircle, TrendingUp, Calendar, Check } from 'lucide-react'

interface Student {
  id: string
  name: string | null
  email: string
  is_subscribed: boolean
  subscription_valid_until: string | null
}

interface ExamRecord {
  id: string
  part: number
  score: number
  total: number
  taken_at: string
}

interface ExamSession {
  date: string
  part1?: ExamRecord
  part2?: ExamRecord
}

interface DomainStat {
  name: string
  correct: number
  total: number
}

interface Todo {
  id: string
  task_text: string
  completed: boolean
  expires_at: string
}

interface StudentStats {
  totalAttempts: number
  correctAttempts: number
  totalExamAnswers: number
  correctExamAnswers: number
  recentAttempts: { attempted_at: string; is_correct: boolean }[]
  exams: ExamRecord[]
  domainStats: DomainStat[] | null
  todos: Todo[]
}

const DOMAIN_DISPLAY: Record<string, string> = {
  'Algebra': 'Algebra',
  'Advanced Math': 'Advanced Math',
  'Data Analytics': 'Problem Solving & Data Analysis',
  'Trigonometry': 'Geometry & Trigonometry',
}

function proficiencyLabel(pct: number) {
  if (pct >= 80) return { label: 'Strong',     color: '#34D399' }
  if (pct >= 60) return { label: 'Proficient', color: '#60A5FA' }
  if (pct >= 40) return { label: 'Improving',  color: '#FBBF24' }
  return { label: 'Weak', color: '#F87171' }
}

function scoreColor(pct: number) {
  return pct >= 80 ? '#34D399' : pct >= 50 ? '#FBBF24' : '#F87171'
}

function displayName(s: Student) { return s.name || s.email }

function groupSessions(exams: ExamRecord[]): ExamSession[] {
  const sorted = [...exams].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())
  const used = new Set<string>()
  const sessions: ExamSession[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].id)) continue
    const e = sorted[i]
    if (e.part === 1) {
      const pair = sorted.find((x, j) =>
        j > i && x.part === 2 && !used.has(x.id) &&
        new Date(x.taken_at).toDateString() === new Date(e.taken_at).toDateString()
      )
      if (pair) { used.add(e.id); used.add(pair.id); sessions.push({ date: e.taken_at, part1: e, part2: pair }) }
      else { used.add(e.id); sessions.push({ date: e.taken_at, part1: e }) }
    } else {
      used.add(e.id); sessions.push({ date: e.taken_at, part2: e })
    }
  }
  return sessions.reverse()
}

export default function StudentsClient({ students }: { students: Student[] }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Student | null>(null)
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [loading, setLoading] = useState(false)

  async function openStudent(student: Student) {
    setSelected(student)
    setStats(null)
    setLoading(true)
    const res = await fetch(`/api/teacher/student-stats?studentId=${student.id}`)
    const data = await res.json()
    const attempts: { is_correct: boolean }[] = data.attempts ?? []
    setStats({
      totalAttempts: attempts.length,
      correctAttempts: attempts.filter(a => a.is_correct).length,
      totalExamAnswers: data.totalExamAnswers ?? 0,
      correctExamAnswers: data.correctExamAnswers ?? 0,
      recentAttempts: data.recentAttempts ?? [],
      exams: data.exams ?? [],
      domainStats: data.domainStats ?? null,
      todos: data.todos ?? [],
    })
    setLoading(false)
  }

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    return !q || displayName(s).toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
  })

  // ---- STUDENT DETAIL ----
  if (selected) {
    const sessions = stats ? groupSessions(stats.exams) : []
    const problemAccuracy = stats && stats.totalAttempts > 0 ? Math.round(stats.correctAttempts / stats.totalAttempts * 100) : 0
    const examAccuracy    = stats && stats.totalExamAnswers > 0 ? Math.round(stats.correctExamAnswers / stats.totalExamAnswers * 100) : 0

    const STATS = stats ? [
      { label: 'Problems Tried',   value: stats.totalAttempts,     from: '#60A5FA', to: '#3B82F6' },
      { label: 'Problems Solved',  value: stats.correctAttempts,   from: '#34D399', to: '#10B981' },
      { label: 'Problem Accuracy', value: `${problemAccuracy}%`,   from: '#A78BFA', to: '#7C3AED' },
      { label: 'Exams Taken',      value: sessions.length,         from: '#FBBF24', to: '#F59E0B' },
      { label: 'Exam Accuracy',    value: `${examAccuracy}%`,      from: '#F87171', to: '#EF4444' },
    ] : []

    // Calendar data from recentAttempts
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const todayNum = now.getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const dayMap: Record<string, number> = {}
    for (const a of (stats?.recentAttempts ?? [])) {
      const day = a.attempted_at.split('T')[0]
      dayMap[day] = (dayMap[day] ?? 0) + 1
    }
    const calDays = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      const date = new Date(year, month, d)
      const key = date.toISOString().split('T')[0]
      return { date: key, count: dayMap[key] ?? 0, day: d, isToday: d === todayNum }
    })

    // Domain performance
    const domainStats = stats?.domainStats ?? null
    const strongest = domainStats && domainStats.length > 0
      ? domainStats.reduce((a, b) => (b.total > 0 && b.correct / b.total > (a.total > 0 ? a.correct / a.total : 0)) ? b : a, domainStats[0])
      : null
    const weakest = domainStats && domainStats.length > 0
      ? domainStats.reduce((a, b) => (b.total > 0 && b.correct / b.total < (a.total > 0 ? a.correct / a.total : Infinity)) ? b : a, domainStats[0])
      : null

    const completedTodos = (stats?.todos ?? []).filter(t => t.completed).length
    const totalTodos = (stats?.todos ?? []).length

    return (
      <div>
        <button
          onClick={() => { setSelected(null); setStats(null) }}
          className="flex items-center gap-2 text-sm font-semibold mb-6 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={16} strokeWidth={2} /> Back to Students
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #60A5FA, #1D4ED8)' }}
          >
            {displayName(selected)[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{displayName(selected)}</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{selected.email}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
              {STATS.map(s => (
                <div key={s.label} className="c-card rounded-2xl" style={{ padding: '0.85rem 1rem' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                  <p
                    className="text-2xl font-extrabold tracking-tight"
                    style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Domain Performance */}
            {domainStats && domainStats.length > 0 && (
              <div className="c-card rounded-2xl p-7 mb-8">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} strokeWidth={1.75} className="text-blue-400" />
                    <h2 className="font-extrabold text-white text-lg tracking-tight">Domain Performance</h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Best exam</span>
                </div>
                {strongest && weakest && (
                  <p className="text-sm text-slate-400 mb-6">
                    Strongest domain: <span className="font-semibold text-emerald-400">{DOMAIN_DISPLAY[strongest.name] ?? strongest.name}</span>.
                    {strongest.name !== weakest.name && (
                      <> <span className="font-semibold" style={{ color: proficiencyLabel(Math.round(weakest.correct / weakest.total * 100)).color }}>{DOMAIN_DISPLAY[weakest.name] ?? weakest.name}</span> needs the most improvement.</>
                    )}
                  </p>
                )}
                <div className="space-y-5">
                  {domainStats.map(d => {
                    const pct = d.total > 0 ? Math.round(d.correct / d.total * 100) : 0
                    const { label, color } = proficiencyLabel(pct)
                    const dn = DOMAIN_DISPLAY[d.name] ?? d.name
                    return (
                      <div key={d.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-slate-200">{dn}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 tabular-nums">{d.correct}/{d.total}</span>
                            <span className="text-xs font-extrabold tabular-nums" style={{ color }}>{pct}%</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>{label}</span>
                          </div>
                        </div>
                        <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: 'var(--input-bg)' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: `0 0 8px ${color}44` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Problems Tried Calendar */}
            <div className="c-card rounded-2xl p-7 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--text-1)' }}>Problems Tried</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{monthName}</p>
                </div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Daily activity</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.375rem' }}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(l => (
                  <div key={l} className="text-center py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{l}</div>
                ))}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`off-${i}`} />)}
                {calDays.map(d => (
                  <div key={d.date} className="flex flex-col items-center gap-1">
                    <div
                      className="w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200"
                      style={d.isToday
                        ? { background: 'linear-gradient(135deg, rgba(167,139,250,0.25), rgba(124,58,237,0.15))', border: '1px solid rgba(167,139,250,0.45)', boxShadow: '0 0 14px rgba(167,139,250,0.25)' }
                        : d.count > 0
                          ? { background: 'linear-gradient(135deg, rgba(96,165,250,0.18), rgba(59,130,246,0.1))', border: '1px solid rgba(96,165,250,0.35)' }
                          : { background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
                    >
                      {d.count > 0 && (
                        <span className="text-sm font-extrabold" style={{ color: d.isToday ? '#C4B5FD' : '#60A5FA' }}>{d.count}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums" style={{ color: d.isToday ? '#A78BFA' : 'rgba(100,116,139,0.6)' }}>{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Study Planner (read-only) */}
            {totalTodos > 0 && (
              <div className="c-card rounded-2xl p-7 mb-8">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-extrabold text-white text-lg tracking-tight">Weekly Study Planner</h2>
                    <p className="text-xs text-slate-500 mt-1">{completedTodos}/{totalTodos} complete</p>
                  </div>
                  <Calendar size={18} strokeWidth={1.75} className="text-blue-400 shrink-0" />
                </div>
                {/* Progress bar */}
                <div className="w-full rounded-full overflow-hidden mb-5" style={{ height: 6, background: 'var(--input-bg)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalTodos > 0 ? Math.round(completedTodos / totalTodos * 100) : 0}%`, background: 'linear-gradient(90deg, #34D399, #10B981)' }}
                  />
                </div>
                <div className="space-y-2">
                  {stats!.todos.map(t => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
                    >
                      <span
                        className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                        style={t.completed
                          ? { background: 'rgba(16,185,129,0.2)', border: '2px solid #34D399', color: '#34D399' }
                          : { background: 'transparent', border: '2px solid rgba(148,163,184,0.5)' }}
                      >
                        {t.completed && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span
                        className="flex-1 text-sm"
                        style={{ color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none' }}
                      >
                        {t.task_text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exam records */}
            <div className="c-card rounded-2xl overflow-hidden mb-6">
              <div className="px-7 py-5" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <h2 className="font-extrabold text-white tracking-tight">Exam Records</h2>
              </div>
              {sessions.length === 0 ? (
                <div className="px-7 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No exams taken yet.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {sessions.map((session, idx) => {
                    const e1 = session.part1
                    const e2 = session.part2
                    const pct1 = e1 ? Math.round(e1.score / e1.total * 100) : null
                    const pct2 = e2 ? Math.round(e2.score / e2.total * 100) : null
                    const c1 = pct1 != null ? scoreColor(pct1) : '#475569'
                    const c2 = pct2 != null ? scoreColor(pct2) : '#475569'
                    return (
                      <div key={idx} className="px-7 py-5">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <span className="text-sm font-bold text-white">
                            {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {e1 && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums" style={{ background: `${c1}1a`, color: c1, border: `1px solid ${c1}40` }}>M1 {e1.score}/{e1.total}</span>}
                          {e2 && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums" style={{ background: `${c2}1a`, color: c2, border: `1px solid ${c2}40` }}>M2 {e2.score}/{e2.total}</span>}
                        </div>
                        <div className="flex gap-8 text-sm">
                          {e1 && pct1 != null && (
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Module 1</span>
                              <p className="font-extrabold tabular-nums" style={{ color: c1 }}>{e1.score}/{e1.total} ({pct1}%)</p>
                              <div className="w-24 bg-white/5 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                <div className="h-1.5 rounded-full" style={{ width: `${pct1}%`, background: c1 }} />
                              </div>
                            </div>
                          )}
                          {e2 && pct2 != null && (
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Module 2</span>
                              <p className="font-extrabold tabular-nums" style={{ color: c2 }}>{e2.score}/{e2.total} ({pct2}%)</p>
                              <div className="w-24 bg-white/5 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                <div className="h-1.5 rounded-full" style={{ width: `${pct2}%`, background: c2 }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Subscription status */}
            <div className="c-card rounded-2xl p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Subscription</p>
              <div className="flex items-center gap-3">
                {selected.is_subscribed
                  ? <CheckCircle size={18} className="shrink-0" style={{ color: '#34D399' }} />
                  : <XCircle size={18} className="shrink-0" style={{ color: '#F87171' }} />}
                <div>
                  <p className="font-bold text-sm" style={{ color: selected.is_subscribed ? '#34D399' : '#F87171' }}>
                    {selected.is_subscribed ? 'Active' : 'No subscription'}
                  </p>
                  {selected.is_subscribed && selected.subscription_valid_until && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Valid until {new Date(selected.subscription_valid_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ---- STUDENT LIST ----
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">Students</h1>
        <p className="text-slate-400 mt-2 text-lg">{students.length} student{students.length !== 1 ? 's' : ''}</p>
      </div>

      {students.length === 0 ? (
        <div className="c-card rounded-2xl p-14 text-center text-slate-500">No students yet.</div>
      ) : (
        <div>
          <div className="relative mb-4">
            <Search size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students…"
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-color)' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
            />
          </div>
          <div className="c-card rounded-2xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-sm">No students found</div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map(s => (
                  <button
                    key={s.id}
                    onClick={() => openStudent(s)}
                    className="w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-white/5 transition-all"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, #60A5FA, #1D4ED8)' }}
                    >
                      {displayName(s)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-white text-sm truncate">{displayName(s)}</span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2"
                          style={s.is_subscribed
                            ? { background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }
                            : { background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.25)' }}
                        >
                          {s.is_subscribed ? 'Subscribed' : 'Free'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{s.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
