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
  if (p.type === 'mc') {
    return p.choices?.find(c => c.is_correct)?.label ?? p.solution
  }
  return p.solution
}

export default function ExamClient({ problems, userId }: ExamClientProps) {
  const [state, setState] = useState<ExamState>('idle')
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION)
  const [startTime, setStartTime] = useState(0)
  const [result, setResult] = useState<ExamResult | null>(null)
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
      .select()
      .single()

    if (examRow) {
      await supabase.from('exam_answers').insert(
        examAnswers.map(a => ({ ...a, exam_id: examRow.id }))
      )
    }

    setResult({ score, total: problems.length, duration_s: duration, satScore: toSatScore(score, problems.length), breakdown })
    setState('submitted')
    setSubmitting(false)
  }, [answers, problems, startTime, userId, submitting, supabase])

  useEffect(() => {
    if (state !== 'active') return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer)
          submitExam()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [state, submitExam])

  function startExam() {
    setCurrent(0)
    setAnswers({})
    setTimeLeft(EXAM_DURATION)
    setStartTime(Date.now())
    submitted.current = false
    setState('active')
  }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  if (state === 'idle') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Exam</h1>
        <div className="max-w-md">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Full SAT Practice Exam</h2>
            <p className="text-sm text-slate-500 mb-1">{problems.length} questions · 44 minutes</p>
            <p className="text-sm text-slate-500 mb-6">Covers Easy, Medium, and Hard difficulty</p>
            <button
              onClick={startExam}
              disabled={problems.length === 0}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-lg text-sm"
            >
              {problems.length === 0 ? 'No questions available' : 'Start Exam'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'submitted' && result) {
    const m = Math.floor(result.duration_s / 60)
    const s = result.duration_s % 60
    const satColor = result.satScore >= 650 ? 'text-green-600' : result.satScore >= 450 ? 'text-yellow-600' : 'text-red-600'

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6 text-center">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">SAT Score</p>
          <div className={`text-6xl font-bold mb-1 ${satColor}`}>{result.satScore}</div>
          <p className="text-slate-400 text-sm">out of 800</p>

          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-slate-600">
            <span>{result.score} / {result.total} correct</span>
            <span className="text-slate-300">|</span>
            <span>{m}m {s}s</span>
          </div>

          <button
            onClick={() => { setState('idle'); setResult(null) }}
            className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm"
          >
            Take Another Exam
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Question Breakdown</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {result.breakdown.map((item, i) => (
              <div key={i} className="px-5 py-4 flex items-start gap-4">
                <span className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  item.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                  {item.isCorrect ? '✓' : '✗'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 line-clamp-2 mb-1">{item.problem.question}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>Your answer: <span className={`font-medium ${item.isCorrect ? 'text-green-700' : 'text-red-600'}`}>{item.userAnswer || '—'}</span></span>
                    {!item.isCorrect && (
                      <span>Correct: <span className="font-medium text-slate-700">{item.correctAnswer}</span></span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                  item.problem.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  item.problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-600'
                }`}>{item.problem.difficulty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const problem = problems[current]
  const urgentTime = timeLeft <= 120

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">SAT Practice Exam</h1>
          <p className="text-sm text-slate-500">Question {current + 1} of {problems.length}</p>
        </div>
        <div className={`text-2xl font-mono font-bold tabular-nums ${urgentTime ? 'text-red-600' : 'text-slate-700'}`}>
          {fmtTime(timeLeft)}
        </div>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-1.5 mb-6">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((current + 1) / problems.length) * 100}%` }}
        />
      </div>

      {problem && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            {problem.title && <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{problem.title}</p>}
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
              problem.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-600'
            }`}>{problem.difficulty}</span>
          </div>
          <p className="text-slate-900 mb-5 whitespace-pre-wrap">{problem.question}</p>

          {problem.type === 'mc' ? (
            <div className="space-y-2">
              {(problem.choices ?? []).sort((a, b) => a.order_index - b.order_index).map(c => (
                <label key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  answers[current] === c.label ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="radio" name={`q${current}`} value={c.label}
                    checked={answers[current] === c.label}
                    onChange={() => setAnswers(a => ({ ...a, [current]: c.label }))}
                    className="accent-blue-600" />
                  <span className="text-sm font-medium text-slate-600 w-4">{c.label}</span>
                  <span className="text-sm text-slate-800">{c.choice_text}</span>
                </label>
              ))}
            </div>
          ) : (
            <input
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your answer"
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
          className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50"
        >
          ← Previous
        </button>

        {current < problems.length - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => {
              const unanswered = problems.length - Object.keys(answers).length
              if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return
              submitExam()
            }}
            disabled={submitting}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm"
          >
            {submitting ? 'Submitting…' : 'Submit Exam'}
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {problems.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
              i === current ? 'bg-blue-600 text-white' :
              i in answers ? 'bg-green-100 text-green-700' :
              'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
