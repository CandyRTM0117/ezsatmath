'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Problem, Choice } from '@/types'

type ProblemWithChoices = Problem & { choices?: Choice[] }

const EXAM_DURATION = 44 * 60

interface ExamClientProps {
  problems: ProblemWithChoices[]
  userId: string
}

interface AnswerResult {
  problem: ProblemWithChoices
  userAnswer: string
  isCorrect: boolean
  correctAnswer: string
}

interface ExamResult {
  score: number
  total: number
  duration_s: number
  satScore: number
  breakdown: AnswerResult[]
}

type ExamState = 'idle' | 'active' | 'submitted'

function toSatScore(raw: number, total: number): number {
  if (total === 0) return 200
  return Math.round(200 + (raw / total) * 600)
}

function correctAnswerFor(p: ProblemWithChoices): string {
  if (p.type === 'mc') return p.choices?.find(c => c.is_correct)?.label ?? p.solution
  return p.solution
}

const diffStyle = (d: string) => ({
  easy:   { background: 'rgba(16,185,129,0.12)', color: '#059669' },
  medium: { background: 'rgba(245,158,11,0.12)', color: '#D97706' },
  hard:   { background: 'rgba(239,68,68,0.12)',  color: '#DC2626' },
}[d] ?? {})

export default function ExamClient({ problems, userId }: ExamClientProps) {
  const [state, setState]       = useState<ExamState>('idle')
  const [current, setCurrent]   = useState(0)
  const [answers, setAnswers]   = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION)
  const [startTime, setStartTime] = useState(0)
  const [result, setResult]     = useState<ExamResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submitted = useRef(false)
  const supabase = createClient()

  const submitExam = useCallback(async (forceAnswers?: Record<number, string>) => {
    if (submitted.current || submitting) return
    submitted.current = true
    setSubmitting(true)

    const finalAnswers = forceAnswers ?? answers
    const duration = Math.round((Date.now() - startTime) / 1000)
    let score = 0
    const breakdown: AnswerResult[] = []

    const examAnswers = problems.map((p, i) => {
      const userAnswer = finalAnswers[i] ?? ''
      const isCorrect = p.type === 'mc'
        ? p.choices?.find(c => c.label === userAnswer)?.is_correct ?? false
        : userAnswer.trim().toLowerCase() === p.solution.trim().toLowerCase()
      if (isCorrect) score++
      breakdown.push({ problem: p, userAnswer, isCorrect, correctAnswer: correctAnswerFor(p) })
      return { problem_id: p.id, user_answer: userAnswer, is_correct: isCorrect }
    })

    const { data: examRow } = await supabase
      .from('exams')
      .insert({ user_id: userId, part: 1, score, total: problems.length, duration_s: duration })
      .select().single()

    if (examRow) {
      await supabase.from('exam_answers').insert(examAnswers.map(a => ({ ...a, exam_id: examRow.id })))
    }

    setResult({ score, total: problems.length, duration_s: duration, satScore: toSatScore(score, problems.length), breakdown })
    setState('submitted')
    setSubmitting(false)
  }, [answers, problems, startTime, userId, submitting, supabase])

  useEffect(() => {
    if (state !== 'active') return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); submitExam(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [state, submitExam])

  function startExam() {
    setCurrent(0); setAnswers({}); setTimeLeft(EXAM_DURATION)
    setStartTime(Date.now()); submitted.current = false; setState('active')
  }

  function fmtTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  /* ── Idle ── */
  if (state === 'idle') {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Exam</h1>
          <p className="text-slate-500 mt-1.5">Full-length SAT practice exam</p>
        </div>

        <div className="max-w-lg">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #3B82F6, #6366F1)' }} />
            <div className="p-8">
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">SAT Math Practice</h2>
              <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                <span className="flex items-center gap-1.5">📝 {problems.length} questions</span>
                <span className="flex items-center gap-1.5">⏱ 44 minutes</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {['Easy', 'Medium', 'Hard'].map(d => (
                  <div key={d} className="rounded-xl p-3 text-center" style={diffStyle(d.toLowerCase())}>
                    <p className="text-xs font-bold uppercase tracking-wider">{d}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={startExam}
                disabled={problems.length === 0}
                className="w-full py-4 font-bold text-white rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-base"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}
              >
                {problems.length === 0 ? 'No questions available' : 'Start Exam →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Results ── */
  if (state === 'submitted' && result) {
    const m = Math.floor(result.duration_s / 60)
    const s = result.duration_s % 60
    const satColor = result.satScore >= 650 ? '#10B981' : result.satScore >= 450 ? '#F59E0B' : '#EF4444'

    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Exam Results</h1>
        </div>

        {/* Score card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${satColor}, ${satColor}88)` }} />
          <div className="p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">SAT Score</p>
            <div className="text-7xl font-extrabold mb-2 tracking-tight" style={{ color: satColor }}>{result.satScore}</div>
            <p className="text-slate-400 text-sm mb-5">out of 800</p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="text-center">
                <p className="font-extrabold text-slate-900 text-lg">{result.score}/{result.total}</p>
                <p className="text-slate-400 text-xs mt-0.5">Correct</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <p className="font-extrabold text-slate-900 text-lg">{m}m {s}s</p>
                <p className="text-slate-400 text-xs mt-0.5">Duration</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <p className="font-extrabold text-slate-900 text-lg">{Math.round(result.score / result.total * 100)}%</p>
                <p className="text-slate-400 text-xs mt-0.5">Accuracy</p>
              </div>
            </div>
            <button
              onClick={() => { setState('idle'); setResult(null) }}
              className="mt-7 px-7 py-3 font-bold text-white rounded-full text-sm transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
            >
              Take Another Exam
            </button>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-900">Question Breakdown</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {result.breakdown.map((item, i) => (
              <div key={i} className="px-6 py-4 flex items-start gap-4">
                <span
                  className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={item.isCorrect
                    ? { background: 'rgba(16,185,129,0.12)', color: '#059669' }
                    : { background: 'rgba(239,68,68,0.12)', color: '#DC2626' }}
                >
                  {item.isCorrect ? '✓' : '✗'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 line-clamp-2 mb-1.5">{item.problem.question}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>Your answer: <span className={`font-semibold ${item.isCorrect ? 'text-green-700' : 'text-red-600'}`}>{item.userAnswer || '—'}</span></span>
                    {!item.isCorrect && <span>Correct: <span className="font-semibold text-slate-700">{item.correctAnswer}</span></span>}
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold capitalize flex-shrink-0" style={diffStyle(item.problem.difficulty)}>
                  {item.problem.difficulty}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── Active exam ── */
  const problem = problems[current]
  const urgentTime = timeLeft <= 120
  const answeredCount = Object.keys(answers).length

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">SAT Practice Exam</h1>
          <p className="text-sm text-slate-500 mt-0.5">{answeredCount} of {problems.length} answered</p>
        </div>
        {/* Timer badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full font-mono font-extrabold text-lg tabular-nums transition-all"
          style={urgentTime
            ? { background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '2px solid rgba(239,68,68,0.4)' }
            : { background: 'rgba(59,130,246,0.1)', color: '#2563EB', border: '2px solid rgba(59,130,246,0.25)' }}
        >
          {urgentTime && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          {fmtTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-200 rounded-full h-2 mb-6">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${((current + 1) / problems.length) * 100}%`, background: 'linear-gradient(90deg, #3B82F6, #6366F1)' }}
        />
      </div>

      {/* Question card */}
      {problem && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 mb-5">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="text-sm font-bold text-slate-400">Q{current + 1}</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold capitalize" style={diffStyle(problem.difficulty)}>
              {problem.difficulty}
            </span>
            {problem.category && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#2563EB' }}>
                {problem.category}
              </span>
            )}
          </div>

          <p className="text-slate-900 text-base md:text-lg leading-relaxed mb-6 whitespace-pre-wrap font-medium">{problem.question}</p>

          {problem.type === 'mc' ? (
            <div className="space-y-3">
              {(problem.choices ?? []).sort((a, b) => a.order_index - b.order_index).map(c => (
                <label
                  key={c.id}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all"
                  style={answers[current] === c.label
                    ? { borderColor: '#3B82F6', background: 'rgba(59,130,246,0.07)' }
                    : { borderColor: '#E2E8F0' }}
                >
                  <input type="radio" name={`q${current}`} value={c.label}
                    checked={answers[current] === c.label}
                    onChange={() => setAnswers(a => ({ ...a, [current]: c.label }))}
                    className="accent-blue-600 mt-0.5 shrink-0" />
                  <span className="text-sm font-bold text-slate-500 w-5 shrink-0">{c.label}.</span>
                  <span className="text-sm text-slate-800">{c.choice_text}</span>
                </label>
              ))}
            </div>
          ) : (
            <input
              className="w-full px-4 py-3 border-2 rounded-xl text-base transition-all focus:outline-none"
              style={{ borderColor: '#E2E8F0' }}
              onFocus={e => (e.target.style.borderColor = '#3B82F6')}
              onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
              placeholder="Type your answer…"
              value={answers[current] ?? ''}
              onChange={e => setAnswers(a => ({ ...a, [current]: e.target.value }))}
            />
          )}
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setCurrent(c => c - 1)}
          disabled={current === 0}
          className="px-5 py-3 border-2 border-slate-200 text-slate-700 rounded-full text-sm font-semibold disabled:opacity-40 hover:border-slate-300 hover:bg-slate-50 transition-all min-h-[44px]"
        >
          ← Prev
        </button>

        {current < problems.length - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="flex-1 py-3 font-bold text-white rounded-full text-sm transition-all hover:scale-[1.02] min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => {
              const unanswered = problems.length - Object.keys(answers).length
              if (unanswered > 0 && !confirm(`${unanswered} unanswered question(s). Submit anyway?`)) return
              submitExam()
            }}
            disabled={submitting}
            className="flex-1 py-3 font-bold text-white rounded-full text-sm transition-all hover:scale-[1.02] disabled:opacity-60 min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting…
              </span>
            ) : 'Submit Exam ✓'}
          </button>
        )}
      </div>

      {/* Question grid */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {problems.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="w-9 h-9 rounded-lg text-xs font-bold transition-all hover:scale-110 min-h-[44px] min-w-[36px]"
            style={i === current
              ? { background: '#3B82F6', color: 'white' }
              : i in answers
                ? { background: 'rgba(16,185,129,0.15)', color: '#059669' }
                : { background: '#F1F5F9', color: '#64748B' }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
