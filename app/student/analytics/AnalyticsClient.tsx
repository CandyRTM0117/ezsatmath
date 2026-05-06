'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Lock, X, Check, ChevronDown, ChevronUp, Plus, Trash2, Pencil, Calendar, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DomainStat, TodoTask } from './page'

interface ExamRecord {
  id: string
  part: number
  score: number
  total: number
  taken_at: string
}

interface ExamAnswer {
  id: string
  user_answer: string
  is_correct: boolean
  problem?: { question: string; solution: string }
}

interface ExamSession {
  date: string
  part1?: ExamRecord
  part2?: ExamRecord
}

interface Props {
  attempts: { is_correct: boolean; attempted_at: string }[]
  exams: ExamRecord[]
  totalAttempts: number
  correctAttempts: number
  totalExamAnswers: number
  correctExamAnswers: number
  isSubscribed: boolean
  subscriptionValidUntil: string | null
  domainStats: DomainStat[] | null
  initialTodos: TodoTask[]
  userId: string
}

const DOMAIN_DISPLAY: Record<string, string> = {
  'Algebra': 'Algebra',
  'Advanced Math': 'Advanced Math',
  'Data Analytics': 'Problem Solving & Data Analysis',
  'Trigonometry': 'Geometry & Trigonometry',
}

function proficiencyLabel(pct: number) {
  if (pct >= 80) return { label: 'Strong', color: '#34D399' }
  if (pct >= 60) return { label: 'Proficient', color: '#60A5FA' }
  if (pct >= 40) return { label: 'Improving', color: '#FBBF24' }
  return { label: 'Weak', color: '#F87171' }
}

function groupIntoSessions(exams: ExamRecord[]): ExamSession[] {
  const sorted = [...exams].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())
  const used = new Set<string>()
  const sessions: ExamSession[] = []

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].id)) continue
    const e = sorted[i]
    if (e.part === 1) {
      const next = sorted.find((x, j) => j > i && x.part === 2 && !used.has(x.id))
      if (next) {
        used.add(e.id); used.add(next.id)
        sessions.push({ date: e.taken_at, part1: e, part2: next })
      } else {
        used.add(e.id)
        sessions.push({ date: e.taken_at, part1: e })
      }
    } else {
      used.add(e.id)
      sessions.push({ date: e.taken_at, part2: e })
    }
  }

  return sessions.reverse()
}

export default function AnalyticsClient({
  attempts, exams, totalAttempts, correctAttempts, totalExamAnswers, correctExamAnswers,
  isSubscribed, subscriptionValidUntil, domainStats, initialTodos, userId,
}: Props) {
  const [expandedSession, setExpandedSession] = useState<number | null>(null)
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, ExamAnswer[]>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [todos, setTodos] = useState<TodoTask[]>(initialTodos)
  const [newTask, setNewTask] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [todoLoading, setTodoLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const sessions = groupIntoSessions(exams)
  const sessionCount = sessions.length

  const problemAccuracy = totalAttempts ? Math.round(correctAttempts / totalAttempts * 100) : 0
  const examAccuracy    = totalExamAnswers ? Math.round(correctExamAnswers / totalExamAnswers * 100) : 0

  const dayMap: Record<string, number> = {}
  for (const a of attempts) {
    const day = a.attempted_at.split('T')[0]
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayNum = now.getDate()
  const days: { date: string; count: number; day: number; isToday: boolean }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const key = date.toISOString().split('T')[0]
    days.push({ date: key, count: dayMap[key] ?? 0, day: d, isToday: d === todayNum })
  }
  const maxCount = Math.max(...days.map(d => d.count), 1)

  const STATS = [
    { label: 'Problems Tried',   value: totalAttempts,          from: '#60A5FA', to: '#3B82F6' },
    { label: 'Problems Solved',  value: correctAttempts,         from: '#34D399', to: '#10B981' },
    { label: 'Problem Accuracy', value: `${problemAccuracy}%`,  from: '#A78BFA', to: '#7C3AED' },
    { label: 'Exams Taken',      value: sessionCount,            from: '#FBBF24', to: '#F59E0B' },
    { label: 'Exam Accuracy',    value: `${examAccuracy}%`,     from: '#F87171', to: '#EF4444' },
  ]

  async function loadAnswers(examId: string) {
    if (sessionAnswers[examId]) return
    setLoadingId(examId)
    const { data } = await supabase
      .from('exam_answers')
      .select('id, user_answer, is_correct, problem:problems(question, solution)')
      .eq('exam_id', examId)
    setSessionAnswers(prev => ({ ...prev, [examId]: (data ?? []) as unknown as ExamAnswer[] }))
    setLoadingId(null)
  }

  async function toggleSession(idx: number, session: ExamSession) {
    if (expandedSession === idx) { setExpandedSession(null); return }
    setExpandedSession(idx)
    if (session.part1) await loadAnswers(session.part1.id)
    if (session.part2) await loadAnswers(session.part2.id)
  }

  async function addTodo() {
    const text = newTask.trim()
    if (!text || todoLoading) return
    setTodoLoading(true)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    const { data, error } = await supabase.from('todo_tasks').insert({
      user_id: userId,
      task_text: text,
      expires_at: expiresAt.toISOString(),
    }).select('id, task_text, completed, expires_at').single()
    if (!error && data) {
      setTodos(prev => [...prev, data as TodoTask])
      setNewTask('')
    }
    setTodoLoading(false)
  }

  async function toggleTodo(id: string, completed: boolean) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t))
    await supabase.from('todo_tasks').update({ completed }).eq('id', id)
  }

  async function deleteTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id))
    await supabase.from('todo_tasks').delete().eq('id', id)
  }

  async function saveEdit(id: string) {
    const text = editText.trim()
    if (!text) return
    setTodos(prev => prev.map(t => t.id === id ? { ...t, task_text: text } : t))
    setEditingId(null)
    await supabase.from('todo_tasks').update({ task_text: text }).eq('id', id)
  }

  function AnswerList({ examId }: { examId: string }) {
    const answers = sessionAnswers[examId] ?? []
    if (loadingId === examId) return <div className="text-slate-400 text-xs py-3">Loading…</div>
    if (answers.length === 0) return null
    return (
      <div className="space-y-1.5 mt-2">
        {answers.map((a, i) => (
          <div
            key={a.id}
            className="p-3 rounded-xl"
            style={a.is_correct
              ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }
              : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={a.is_correct
                  ? { background: 'rgba(16,185,129,0.2)', color: '#34D399' }
                  : { background: 'rgba(239,68,68,0.2)', color: '#F87171' }}
              >
                {a.is_correct ? <Check size={9} strokeWidth={2.5} /> : <X size={9} strokeWidth={2.5} />}
              </span>
              <p className="text-xs font-semibold text-slate-200">Q{i + 1}: {(a.problem as any)?.question?.slice(0, 80)}…</p>
            </div>
            <p className="text-xs text-slate-400 ml-6">
              Your answer: <span className={a.is_correct ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{a.user_answer || '—'}</span>
              {!a.is_correct && <> · Correct: <span className="text-slate-300 font-semibold">{(a.problem as any)?.solution}</span></>}
            </p>
          </div>
        ))}
      </div>
    )
  }

  // Domain performance section
  function DomainPerformance() {
    if (!domainStats || domainStats.length === 0) return null

    const strongest = domainStats.reduce((a, b) => (b.total > 0 && b.correct / b.total > a.correct / a.total) ? b : a, domainStats[0])
    const weakest = domainStats.reduce((a, b) => (b.total > 0 && b.correct / b.total < a.correct / a.total) ? b : a, domainStats[0])

    return (
      <div className="c-card rounded-2xl p-7 mb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} strokeWidth={1.75} className="text-blue-400" />
            <h2 className="font-extrabold text-white text-lg tracking-tight">Domain Performance</h2>
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Best exam</span>
        </div>

        {/* AI-like summary */}
        <p className="text-sm text-slate-400 mb-6">
          Your strongest domain is <span className="font-semibold text-emerald-400">{DOMAIN_DISPLAY[strongest.name] ?? strongest.name}</span>.
          {strongest.name !== weakest.name && (
            <> <span className="font-semibold" style={{ color: proficiencyLabel(Math.round(weakest.correct / weakest.total * 100)).color }}>{DOMAIN_DISPLAY[weakest.name] ?? weakest.name}</span> needs the most improvement.</>
          )}
        </p>

        <div className="space-y-5">
          {domainStats.map(d => {
            const pct = d.total > 0 ? Math.round(d.correct / d.total * 100) : 0
            const { label, color } = proficiencyLabel(pct)
            const displayName = DOMAIN_DISPLAY[d.name] ?? d.name
            return (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-slate-200">{displayName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 tabular-nums">{d.correct}/{d.total}</span>
                    <span className="text-xs font-extrabold tabular-nums" style={{ color }}>{pct}%</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
                    >
                      {label}
                    </span>
                  </div>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: 'var(--input-bg)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: `0 0 8px ${color}44` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Weekly todo widget
  function TodoWidget() {
    const completed = todos.filter(t => t.completed).length
    return (
      <div className="c-card rounded-2xl p-7 mb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-extrabold text-white text-lg tracking-tight">Weekly Study Planner</h2>
            <p className="text-xs text-slate-500 mt-0.5">Tasks reset every 7 days · {completed}/{todos.length} complete</p>
          </div>
          <Calendar size={18} strokeWidth={1.75} className="text-blue-400 shrink-0" />
        </div>

        {/* Add task input */}
        <div className="flex gap-2 mb-5">
          <input
            ref={inputRef}
            type="text"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTodo() }}
            placeholder="Add a study task…"
            className="flex-1 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-color)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
          />
          <button
            onClick={addTodo}
            disabled={!newTask.trim() || todoLoading}
            className="px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Task list */}
        {todos.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No tasks yet. Add one above!</p>
        ) : (
          <div className="space-y-2">
            {todos.map(t => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
              >
                <button
                  onClick={() => toggleTodo(t.id, !t.completed)}
                  className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                  style={t.completed
                    ? { background: 'rgba(16,185,129,0.2)', borderColor: '#34D399', color: '#34D399' }
                    : { borderColor: 'rgba(255,255,255,0.2)', color: 'transparent' }}
                >
                  {t.completed && <Check size={11} strokeWidth={3} />}
                </button>

                {editingId === t.id ? (
                  <input
                    type="text"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(t.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    className="flex-1 bg-transparent text-sm focus:outline-none text-white"
                    onBlur={() => saveEdit(t.id)}
                  />
                ) : (
                  <span
                    className="flex-1 text-sm transition-all"
                    style={{ color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none' }}
                  >
                    {t.task_text}
                  </span>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditingId(t.id); setEditText(t.task_text) }}
                    className="p-1.5 rounded-lg transition-colors hover:bg-white/5 text-slate-500 hover:text-slate-300"
                  >
                    <Pencil size={13} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => deleteTodo(t.id)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const premiumContent = (
    <>
      {/* Subscription valid until badge */}
      {subscriptionValidUntil && (
        <div
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-sm font-semibold"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34D399' }}
        >
          <Calendar size={14} strokeWidth={2} />
          Pro Active Until: {new Date(subscriptionValidUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {STATS.map(s => (
          <div
            key={s.label}
            className="c-card rounded-2xl p-5 transition-all duration-300"
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
            <p
              className="text-3xl font-extrabold tracking-tight"
              style={{
                background: `linear-gradient(135deg, ${s.from}, ${s.to})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <DomainPerformance />

      <div className="c-card rounded-2xl p-7 mb-8">
        <div className="flex items-center justify-between mb-7">
          <h2 className="font-extrabold text-white text-lg tracking-tight">Problems Tried — {monthName}</h2>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Daily activity</span>
        </div>
        <div className="flex items-end gap-px h-40">
          {days.map(d => (
            <div key={d.date} className="flex-1 flex flex-col items-center group relative">
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${(d.count / maxCount) * 100}%`,
                  minHeight: d.count > 0 ? '4px' : '0',
                  background: d.isToday
                    ? 'linear-gradient(180deg, #A78BFA, #7C3AED)'
                    : d.count > 0
                      ? 'linear-gradient(180deg, #60A5FA, #3B82F6)'
                      : 'var(--input-bg)',
                  boxShadow: d.count > 0 ? (d.isToday ? '0 0 12px rgba(167,139,250,0.5)' : '0 0 12px rgba(96,165,250,0.4)') : 'none',
                }}
              />
              {d.count > 0 && (
                <div
                  className="absolute -top-9 left-1/2 -translate-x-1/2 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10"
                  style={{ background: 'var(--app-bg-alt)', border: '1px solid var(--card-border)' }}
                >
                  {d.count} · {d.date.slice(5)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-px mt-1">
          {days.map(d => (
            <div key={d.date} className="flex-1 text-center">
              <span
                className="text-[7px] font-medium"
                style={{ color: d.isToday ? '#A78BFA' : 'rgba(100,116,139,0.7)' }}
              >
                {d.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      <TodoWidget />
    </>
  )

  const lockedTodo = (
    <div
      className="c-card rounded-2xl p-7 mb-8"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-extrabold text-white text-lg tracking-tight">Weekly Study Planner</h2>
        <Lock size={16} strokeWidth={1.75} className="text-slate-500" />
      </div>
      <div
        className="rounded-xl p-5 text-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
      >
        <Lock size={20} strokeWidth={1.5} className="text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Upgrade to Pro to use the Weekly Study Planner</p>
        <Link
          href="/student/subscription"
          className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 text-xs font-bold text-white rounded-full transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Analytics
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Your performance at a glance</p>
      </div>

      {isSubscribed ? (
        premiumContent
      ) : (
        <>
          <div className="relative mb-8">
            <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.4 }}>
              {/* Blurred preview (no todo widget for free) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {STATS.map(s => (
                  <div key={s.label} className="c-card rounded-2xl p-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
                    <p className="text-3xl font-extrabold tracking-tight" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div
                className="rounded-2xl p-8 text-center max-w-sm w-full mx-4"
                style={{
                  background: 'rgba(11,18,36,0.95)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                }}
              >
                <div
                  className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}
                >
                  <Lock size={24} strokeWidth={1.5} className="text-blue-300" />
                </div>
                <h2 className="text-xl font-extrabold text-white mb-2 tracking-tight">Unlock with Pro</h2>
                <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                  Get detailed performance insights, domain charts, and the weekly study planner.
                </p>
                <Link
                  href="/student/subscription"
                  className="inline-flex items-center justify-center w-full py-3 font-bold text-white rounded-full text-sm transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}
                >
                  Unlock with Pro
                </Link>
              </div>
            </div>
          </div>
          {lockedTodo}
        </>
      )}

      {/* Exam History — visible to all */}
      <div className="c-card rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-white/8">
          <h2 className="font-extrabold text-white text-lg tracking-tight">Exam History</h2>
        </div>

        {sessions.length === 0 ? (
          <div className="px-7 py-14 text-center text-slate-500 text-sm">No exams taken yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {sessions.map((session, idx) => {
              const totalScore = (session.part1?.score ?? 0) + (session.part2?.score ?? 0)
              const totalTotal = (session.part1?.total ?? 0) + (session.part2?.total ?? 0)
              const pct = totalTotal ? Math.round(totalScore / totalTotal * 100) : 0
              const color = pct >= 80 ? '#34D399' : pct >= 50 ? '#FBBF24' : '#F87171'
              const isOpen = expandedSession === idx
              const dateStr = new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

              return (
                <div key={idx}>
                  <button
                    className="w-full px-7 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left"
                    onClick={() => toggleSession(idx, session)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-semibold text-slate-300">Full Test · {dateStr}</span>
                        <span className="font-extrabold tabular-nums" style={{ color }}>
                          {totalScore}/{totalTotal} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}66` }} />
                      </div>
                    </div>
                    {isOpen
                      ? <ChevronUp size={16} strokeWidth={2} className="text-slate-400 shrink-0" />
                      : <ChevronDown size={16} strokeWidth={2} className="text-slate-400 shrink-0" />
                    }
                  </button>

                  {isOpen && (
                    <div className="c-card-inner px-7 pb-5 space-y-4">
                      {[session.part1, session.part2].map((part, pi) => {
                        if (!part) return null
                        const pp = Math.round(part.score / part.total * 100)
                        const pc = pp >= 80 ? '#34D399' : pp >= 50 ? '#FBBF24' : '#F87171'
                        return (
                          <div key={part.id} className="c-row rounded-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Part {part.part}</span>
                              <span className="text-sm font-extrabold tabular-nums" style={{ color: pc }}>
                                {part.score}/{part.total} ({pp}%)
                              </span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mb-3">
                              <div className="h-1.5 rounded-full" style={{ width: `${pp}%`, background: pc }} />
                            </div>
                            <AnswerList examId={part.id} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
