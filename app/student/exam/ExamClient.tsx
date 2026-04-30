'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Timer, ArrowLeft, ArrowRight, Check, X, Loader2 } from 'lucide-react'
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

const diffStyle = (d: string): React.CSSProperties => ({
  easy:   { background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' },
  medium: { background: 'rgba(245,158,11,0.12)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.25)' },
  hard:   { background: 'rgba(239,68,68,0.12)',  color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' },
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

  /* Idle */
  if (state === 'idle') {
    return (
      <div>
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
            Exam
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Full-length SAT practice exam</p>
        </div>

        <div className="max-w-lg">
          <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
              boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 0 60px rgba(59,130,246,0.08)',
            }}
          >
            <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #60A5FA, #6366F1)' }} />
            <div className="p-8">
              <h2 className="text-2xl font-extrabold text-white mb-3 tracking-tight">SAT Math Practice</h2>
              <div className="flex items-center gap-5 text-sm text-slate-400 mb-7">
                <span className="inline-flex items-center gap-2"><FileText size={16} strokeWidth={1.75} className="text-blue-400" /> {problems.length} questions</span>
                <span className="inline-flex items-center gap-2"><Timer size={16} strokeWidth={1.75} className="text-blue-400" /> 44 minutes</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {['Easy', 'Medium', 'Hard'].map(d => (
                  <div key={d} className="rounded-xl p-3 text-center" style={diffStyle(d.toLowerCase())}>
                    <p className="text-[11px] font-bold uppercase tracking-widest">{d}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={startExam}
                disabled={problems.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 py-4 font-bold text-white rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 text-base"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 12px 30px rgba(59,130,246,0.4)' }}
              >
                {problems.length === 0 ? 'No questions available' : (<>Start Exam <ArrowRight size={16} strokeWidth={2.5} /></>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* Results */
  if (state === 'submitted' && result) {
    const m = Math.floor(result.duration_s / 60)
    const s = result.duration_s % 60
    const satColor = result.satScore >= 650 ? '#34D399' : result.satScore >= 450 ? '#FBBF24' : '#F87171'

    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
            Exam Results
          </h1>
        </div>

        <div
          className="rounded-2xl border border-white/10 overflow-hidden mb-6"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          }}
        >
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${satColor}, ${satColor}55)` }} />
          <div className="p-10 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">SAT Score</p>
            <div
              className="text-8xl font-extrabold mb-2 tracking-tight"
              style={{
                background: `linear-gradient(135deg, ${satColor}, ${satColor}aa)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: `drop-shadow(0 0 24px ${satColor}55)`,
              }}
            >
              {result.satScore}
            </div>
            <p className="text-slate-500 text-sm mb-6">out of 800</p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="text-center">
                <p className="font-extrabold text-white text-xl">{result.score}/{result.total}</p>
                <p className="text-slate-500 text-xs mt-0.5 uppercase tracking-widest">Correct</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="font-extrabold text-white text-xl">{m}m {s}s</p>
                <p className="text-slate-500 text-xs mt-0.5 uppercase tracking-widest">Duration</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="font-extrabold text-white text-xl">{Math.round(result.score / result.total * 100)}%</p>
                <p className="text-slate-500 text-xs mt-0.5 uppercase tracking-widest">Accuracy</p>
              </div>
            </div>
            <button
              onClick={() => { setState('idle'); setResult(null) }}
              className="mt-8 px-8 py-3 font-bold text-white rounded-full text-sm transition-all duration-200 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}
            >
              Take Another Exam
            </button>
          </div>
        </div>

        <div
          className="rounded-2xl border border-white/10 overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}
        >
          <div className="px-7 py-5 border-b border-white/8">
            <h2 className="font-extrabold text-white tracking-tight">Question Breakdown</h2>
          </div>
          <div className="divide-y divide-white/5">
            {result.breakdown.map((item, i) => (
              <div key={i} className="px-7 py-4 flex items-start gap-4">
                <span
                  className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={item.isCorrect
                    ? { background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }
                    : { background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  {item.isCorrect ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 line-clamp-2 mb-1.5">{item.problem.question}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>Your answer: <span className={`font-semibold ${item.isCorrect ? 'text-green-400' : 'text-red-400'}`}>{item.userAnswer || '—'}</span></span>
                    {!item.isCorrect && <span>Correct: <span className="font-semibold text-slate-300">{item.correctAnswer}</span></span>}
                  </div>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full font-bold capitalize flex-shrink-0" style={diffStyle(item.problem.difficulty)}>
                  {item.problem.difficulty}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* Active exam */
  const problem = problems[current]
  const urgentTime = timeLeft <= 120
  const answeredCount = Object.keys(answers).length

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">SAT Practice Exam</h1>
          <p className="text-sm text-slate-400 mt-0.5">{answeredCount} of {problems.length} answered</p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full font-mono font-extrabold text-lg tabular-nums transition-all"
          style={urgentTime
            ? { background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 0 24px rgba(239,68,68,0.25)' }
            : { background: 'rgba(59,130,246,0.12)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.3)' }}
        >
          {urgentTime && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
          {fmtTime(timeLeft)}
        </div>
      </div>

      <div className="w-full bg-white/5 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${((current + 1) / problems.length) * 100}%`,
            background: 'linear-gradient(90deg, #60A5FA, #6366F1)',
            boxShadow: '0 0 12px rgba(96,165,250,0.6)',
          }}
        />
      </div>

      {problem && (
        <div
          className="rounded-2xl border border-white/10 p-7 md:p-9 mb-5"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <span className="text-sm font-bold text-slate-500">Q{current + 1}</span>
            <span className="text-[11px] px-2.5 py-1 rounded-full font-bold capitalize" style={diffStyle(problem.difficulty)}>
              {problem.difficulty}
            </span>
            {problem.category && (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.2)' }}>
                {problem.category}
              </span>
            )}
          </div>

          <p className="text-slate-100 text-base md:text-lg leading-relaxed mb-7 whitespace-pre-wrap font-medium">{problem.question}</p>

          {problem.type === 'mc' ? (
            <div className="space-y-3">
              {(problem.choices ?? []).sort((a, b) => a.order_index - b.order_index).map(c => {
                const isSelected = answers[current] === c.label
                return (
                  <label
                    key={c.id}
                    className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200"
                    style={isSelected
                      ? { borderColor: '#3B82F6', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.5)' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <input type="radio" name={`q${current}`} value={c.label}
                      checked={isSelected}
                      onChange={() => setAnswers(a => ({ ...a, [current]: c.label }))}
                      className="accent-blue-500 mt-0.5 shrink-0" />
                    <span className="text-sm font-bold text-slate-400 w-5 shrink-0">{c.label}.</span>
                    <span className="text-sm text-slate-200">{c.choice_text}</span>
                  </label>
                )
              })}
            </div>
          ) : (
            <input
              className="w-full px-4 py-3 rounded-xl text-base text-slate-200 transition-all duration-200 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
              placeholder="Type your answer…"
              value={answers[current] ?? ''}
              onChange={e => setAnswers(a => ({ ...a, [current]: e.target.value }))}
            />
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setCurrent(c => c - 1)}
          disabled={current === 0}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 min-h-[44px]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        >
          <ArrowLeft size={14} strokeWidth={2} /> Prev
        </button>

        {current < problems.length - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 font-bold text-white rounded-full text-sm transition-all duration-200 hover:scale-[1.01] min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}
          >
            Next <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            onClick={() => {
              const unanswered = problems.length - Object.keys(answers).length
              if (unanswered > 0 && !confirm(`${unanswered} unanswered question(s). Submit anyway?`)) return
              submitExam()
            }}
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 font-bold text-white rounded-full text-sm transition-all duration-200 hover:scale-[1.01] disabled:opacity-60 min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" /> Submitting…</>
            ) : (
              <>Submit Exam <Check size={14} strokeWidth={2.5} /></>
            )}
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {problems.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="w-9 h-9 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-110"
            style={i === current
              ? { background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: 'white', boxShadow: '0 0 16px rgba(59,130,246,0.5)' }
              : i in answers
                ? { background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
