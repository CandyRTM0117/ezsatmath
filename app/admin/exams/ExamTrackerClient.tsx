'use client'

import { useState } from 'react'
import { X, Loader2, Search, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ExamRow {
  id: string
  part: number
  score: number
  total: number
  duration_s: number
  taken_at: string
  user: { id: string; name: string | null; email: string } | null
}

interface DetailAnswer {
  id: string
  user_answer: string
  is_correct: boolean
  problem?: {
    id: string
    difficulty: string | null
    category: string | null
    topic: string | null
  }
}

interface ExamSession {
  date: string
  user: ExamRow['user']
  part1?: ExamRow
  part2?: ExamRow
}

const diffStyle = (d: string): React.CSSProperties => ({
  easy:   { background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' },
  medium: { background: 'rgba(245,158,11,0.12)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.25)' },
  hard:   { background: 'rgba(239,68,68,0.12)',  color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' },
}[d] ?? {})

function toSatScore(raw: number, total: number) {
  if (total === 0) return 200
  return Math.round(200 + (raw / total) * 600)
}

function scoreColor(pct: number) {
  return pct >= 80 ? '#34D399' : pct >= 50 ? '#FBBF24' : '#F87171'
}

export default function ExamTrackerClient({ initialExams }: { initialExams: ExamRow[] }) {
  const [exams] = useState<ExamRow[]>(initialExams)
  const [selectedExam, setSelectedExam] = useState<ExamRow | null>(null)
  const [pairedExam, setPairedExam] = useState<ExamRow | null>(null)
  const [answers, setAnswers] = useState<DetailAnswer[]>([])
  const [pairedAnswers, setPairedAnswers] = useState<DetailAnswer[]>([])
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const supabase = createClient()

  async function openDetail(e1: ExamRow | undefined, e2: ExamRow | undefined) {
    setSelectedExam(e1 ?? null)
    setPairedExam(e2 ?? null)
    setAnswers([])
    setPairedAnswers([])
    setLoadingAnswers(true)

    const fetches = [
      e1 ? supabase.from('exam_answers').select('id, user_answer, is_correct, problem:problems(id, difficulty, category, topic)').eq('exam_id', e1.id) : Promise.resolve({ data: [] }),
      e2 ? supabase.from('exam_answers').select('id, user_answer, is_correct, problem:problems(id, difficulty, category, topic)').eq('exam_id', e2.id) : Promise.resolve({ data: [] }),
    ]
    const [r1, r2] = await Promise.all(fetches)
    setAnswers(((r1 as any).data ?? []) as DetailAnswer[])
    setPairedAnswers(((r2 as any).data ?? []) as DetailAnswer[])
    setLoadingAnswers(false)
  }

  function fmtDuration(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }

  // Group into sessions (per user per day)
  function buildSessions(rows: ExamRow[]): ExamSession[] {
    const sorted = [...rows].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())
    const used = new Set<string>()
    const sessions: ExamSession[] = []
    for (let i = 0; i < sorted.length; i++) {
      if (used.has(sorted[i].id)) continue
      const e = sorted[i]
      const uid = e.user?.id
      if (e.part === 1) {
        const pair = sorted.find((x, j) =>
          j > i && !used.has(x.id) && x.part === 2 && x.user?.id === uid &&
          new Date(x.taken_at).toDateString() === new Date(e.taken_at).toDateString()
        )
        if (pair) {
          used.add(e.id); used.add(pair.id)
          sessions.push({ date: e.taken_at, user: e.user, part1: e, part2: pair })
        } else {
          used.add(e.id)
          sessions.push({ date: e.taken_at, user: e.user, part1: e })
        }
      } else {
        used.add(e.id)
        sessions.push({ date: e.taken_at, user: e.user, part2: e })
      }
    }
    return sessions.reverse()
  }

  const filteredExams = exams.filter(e => {
    const q = search.toLowerCase()
    const userName = (e.user?.name ?? e.user?.email ?? '').toLowerCase()
    const matchSearch = !q || userName.includes(q)
    const matchDate = !dateFilter || new Date(e.taken_at).toISOString().startsWith(dateFilter)
    return matchSearch && matchDate
  })

  const sessions = buildSessions(filteredExams)

  const modalUser = selectedExam?.user ?? pairedExam?.user
  const modalDate = selectedExam?.taken_at ?? pairedExam?.taken_at

  // Compute scores for modal
  const score1 = selectedExam?.score ?? 0
  const total1 = selectedExam?.total ?? 0
  const score2 = pairedExam?.score ?? 0
  const total2 = pairedExam?.total ?? 0
  const totalScore = score1 + score2
  const totalQ = (selectedExam ? total1 : 0) + (pairedExam ? total2 : 0)
  const sat = toSatScore(totalScore, totalQ)
  const satColor = sat >= 600 ? '#34D399' : sat >= 450 ? '#FBBF24' : '#F87171'
  const pct1 = total1 > 0 ? Math.round(score1 / total1 * 100) : null
  const pct2 = total2 > 0 ? Math.round(score2 / total2 * 100) : null
  const c1 = pct1 != null ? scoreColor(pct1) : '#94A3B8'
  const c2 = pct2 != null ? scoreColor(pct2) : '#94A3B8'

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Exam Tracker
        </h1>
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl">
          <div className="relative flex-1 min-w-0">
            <Search size={15} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-color)' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="py-2.5 px-3 rounded-xl text-sm focus:outline-none transition-all shrink-0"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: dateFilter ? 'var(--input-color)' : 'var(--text-muted)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="p-2 rounded-lg transition-colors shrink-0"
              style={{ color: 'var(--text-muted)', background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {(selectedExam || pairedExam) && (
        <div
          className="c-modal-backdrop fixed inset-0 flex items-center justify-center z-50 overflow-y-auto py-8 px-4 fade-in"
          onClick={() => { setSelectedExam(null); setPairedExam(null) }}
        >
          <div
            className="c-modal rounded-2xl w-full max-w-3xl zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between p-7 pb-0">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  {modalUser?.name ?? modalUser?.email}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalDate && new Date(modalDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => { setSelectedExam(null); setPairedExam(null) }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {/* Score summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-7 pb-5">
              {[
                { label: 'SAT Score',     value: (selectedExam && pairedExam) ? String(sat) : '—', color: satColor },
                { label: 'Total Correct', value: totalQ > 0 ? `${totalScore}/${totalQ}` : '—',      color: '#60A5FA' },
                { label: 'Module 1',      value: pct1 != null ? `${score1}/${total1} (${pct1}%)` : '—', color: c1 },
                { label: 'Module 2',      value: pct2 != null ? `${score2}/${total2} (${pct2}%)` : '—', color: c2 },
              ].map(s => (
                <div key={s.label} className="c-card rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                  <p className="text-lg font-extrabold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Per-part answer tables */}
            {loadingAnswers ? (
              <div className="flex items-center justify-center py-10 gap-3 text-slate-400 text-sm pb-7">
                <Loader2 size={16} className="animate-spin" /> Loading…
              </div>
            ) : (
              <div className="px-7 pb-7 space-y-5 max-h-[55vh] overflow-y-auto">
                {([
                  { label: 'Module 1', record: selectedExam, data: answers },
                  { label: 'Module 2', record: pairedExam,   data: pairedAnswers },
                ] as const).map(({ label, record, data }) => {
                  if (!record || data.length === 0) return null
                  const pct = Math.round(record.score / record.total * 100)
                  const col = scoreColor(pct)
                  return (
                    <div key={label} className="c-card rounded-xl overflow-hidden">
                      {/* Part header */}
                      <div
                        className="px-5 py-3 flex items-center justify-between"
                        style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--table-header-bg)' }}
                      >
                        <h3 className="font-extrabold text-sm tracking-tight text-white">{label} — {record.score}/{record.total}</h3>
                        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: col }}>{pct}% correct</span>
                      </div>

                      {/* Column headers */}
                      <div
                        className="hidden md:grid px-5 py-2 text-[10px] font-bold uppercase tracking-widest select-none"
                        style={{
                          gridTemplateColumns: '2rem 5rem 8rem 1fr 4rem',
                          gap: '0.75rem',
                          color: 'var(--text-muted)',
                          borderBottom: '1px solid var(--card-border)',
                          background: 'var(--table-header-bg)',
                        }}
                      >
                        <span>#</span>
                        <span>Difficulty</span>
                        <span>Problem ID</span>
                        <span>Domain · Topic</span>
                        <span className="text-right">Status</span>
                      </div>

                      {/* Rows */}
                      <div className="divide-y divide-white/5">
                        {data.map((a, i) => {
                          const p = a.problem
                          return (
                            <div
                              key={a.id}
                              className="flex md:grid items-center px-5 py-3 gap-3"
                              style={{ gridTemplateColumns: '2rem 5rem 8rem 1fr 4rem' }}
                            >
                              <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                              <div className="shrink-0">
                                {p?.difficulty ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={diffStyle(p.difficulty)}>
                                    {p.difficulty}
                                  </span>
                                ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                              </div>
                              <p className="text-xs font-mono truncate shrink-0" style={{ color: 'var(--text-muted)' }}>
                                {p?.id ? p.id.slice(0, 8) : '—'}
                              </p>
                              <p className="text-xs truncate hidden md:block" style={{ color: 'var(--text-muted)' }}>
                                {[p?.category, p?.topic].filter(Boolean).join(' · ') || '—'}
                              </p>
                              <div className="flex items-center justify-end gap-1.5 shrink-0 ml-auto md:ml-0">
                                <span
                                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                  style={a.is_correct
                                    ? { background: 'rgba(16,185,129,0.2)', color: '#34D399' }
                                    : { background: 'rgba(239,68,68,0.15)', color: '#F87171' }}
                                >
                                  {a.is_correct
                                    ? <Check size={10} strokeWidth={2.5} />
                                    : <X size={10} strokeWidth={2.5} />}
                                </span>
                                <span className="text-xs font-bold hidden md:block" style={{ color: a.is_correct ? '#34D399' : '#F87171' }}>
                                  {a.user_answer || '—'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {answers.length === 0 && pairedAnswers.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-8">No answers recorded.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Session cards */}
      {sessions.length === 0 ? (
        <div className="c-card rounded-2xl p-14 text-center text-slate-500">No exams found</div>
      ) : (
        <div className="c-card rounded-2xl overflow-hidden divide-y divide-white/5">
          {sessions.map((session, idx) => {
            const e1 = session.part1
            const e2 = session.part2
            const pct1 = e1 ? Math.round(e1.score / e1.total * 100) : null
            const pct2 = e2 ? Math.round(e2.score / e2.total * 100) : null
            const c1 = pct1 != null ? scoreColor(pct1) : '#475569'
            const c2 = pct2 != null ? scoreColor(pct2) : '#475569'
            const userName = session.user?.name ?? session.user?.email ?? '—'
            return (
              <div key={idx} className="px-7 py-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{userName}</span>
                    <span className="text-slate-500 text-[11px]">·</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                      {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {e1 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums" style={{ background: `${c1}1a`, color: c1, border: `1px solid ${c1}40` }}>
                        M1 {e1.score}/{e1.total}
                      </span>
                    )}
                    {e2 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums" style={{ background: `${c2}1a`, color: c2, border: `1px solid ${c2}40` }}>
                        M2 {e2.score}/{e2.total}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openDetail(e1, e2)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-lg shrink-0"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
                  >
                    View Details
                  </button>
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
                  {(e1 ?? e2) && (
                    <div className="ml-auto self-end">
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {fmtDuration((e1?.duration_s ?? 0) + (e2?.duration_s ?? 0))} total
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
