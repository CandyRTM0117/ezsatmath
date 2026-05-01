'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Timer, ArrowLeft, ArrowRight, Check, X, Loader2, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Problem, Choice } from '@/types'

type ProblemWithChoices = Problem & { choices?: Choice[] }

const EXAM_DURATION = 35 * 60
const PART1_EASY = 10
const PART1_MEDIUM = 12
const PART2_HARD_HIGH = 14
const PART2_MEDIUM_HIGH = 8
const PART2_MEDIUM_LOW = 14
const PART2_HARD_LOW = 8
const PART1_THRESHOLD = 11
const FREE_EXAM_LIMIT = 3

interface ExamHistoryRecord {
  id: string
  part: number
  score: number
  total: number
  taken_at: string
}

interface ExamClientProps {
  easyProblems: ProblemWithChoices[]
  mediumProblems: ProblemWithChoices[]
  hardProblems: ProblemWithChoices[]
  userId: string
  isSubscribed: boolean
  examCount: number
  examHistory: ExamHistoryRecord[]
}

interface AnswerResult {
  problem: ProblemWithChoices
  userAnswer: string
  isCorrect: boolean
  correctAnswer: string
}

interface PartResult {
  score: number
  total: number
  duration_s: number
  satScore: number
  breakdown: AnswerResult[]
}

interface DetailAnswer {
  id: string
  user_answer: string
  is_correct: boolean
  problem?: { question: string; solution: string; explanation?: string }
}

interface FullDetail {
  loading: boolean
  e1: ExamHistoryRecord
  e2?: ExamHistoryRecord
  answers1: DetailAnswer[]
  answers2: DetailAnswer[]
}

type ExamPhase = 'idle' | 'part1_active' | 'part1_done' | 'part2_active' | 'final'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pick(pool: ProblemWithChoices[], count: number, exclude: Set<string>): ProblemWithChoices[] {
  return shuffle(pool.filter(p => !exclude.has(p.id))).slice(0, count)
}

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

export default function ExamClient({
  easyProblems, mediumProblems, hardProblems,
  userId, isSubscribed, examCount, examHistory,
}: ExamClientProps) {
  const [phase, setPhase] = useState<ExamPhase>('idle')
  const [part1Problems, setPart1Problems] = useState<ProblemWithChoices[]>([])
  const [part2Problems, setPart2Problems] = useState<ProblemWithChoices[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION)
  const [startTime, setStartTime] = useState(0)
  const [part1Result, setPart1Result] = useState<PartResult | null>(null)
  const [part2Result, setPart2Result] = useState<PartResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fullDetail, setFullDetail] = useState<FullDetail | null>(null)
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set())
  const submitted = useRef(false)
  const supabase = createClient()

  const hasExamsLeft = isSubscribed || examCount < FREE_EXAM_LIMIT
  const activePart = phase === 'part1_active' ? 1 : 2
  const activeProblems = phase === 'part1_active' ? part1Problems : part2Problems

  const submitPart = useCallback(async (
    partNum: 1 | 2,
    problems: ProblemWithChoices[],
    finalAnswers: Record<number, string>,
    duration: number,
  ) => {
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
      .insert({ user_id: userId, part: partNum, score, total: problems.length, duration_s: duration })
      .select().single()

    if (examRow) {
      await supabase.from('exam_answers').insert(examAnswers.map(a => ({ ...a, exam_id: examRow.id })))
    }

    return { score, total: problems.length, duration_s: duration, satScore: toSatScore(score, problems.length), breakdown }
  }, [supabase, userId])

  const submitActivePart = useCallback(async (forceAnswers?: Record<number, string>) => {
    if (submitted.current || submitting) return
    submitted.current = true
    setSubmitting(true)

    const finalAnswers = forceAnswers ?? answers
    const duration = Math.round((Date.now() - startTime) / 1000)

    if (phase === 'part1_active') {
      const result = await submitPart(1, part1Problems, finalAnswers, duration)
      setPart1Result(result)
      setPhase('part1_done')
    } else {
      const result = await submitPart(2, part2Problems, finalAnswers, duration)
      setPart2Result(result)
      setPhase('final')
    }

    setSubmitting(false)
  }, [answers, startTime, phase, part1Problems, part2Problems, submitPart, submitting])

  useEffect(() => {
    if (phase !== 'part1_active' && phase !== 'part2_active') return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); submitActivePart(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [phase, submitActivePart])

  async function openDetail(e1: ExamHistoryRecord, e2?: ExamHistoryRecord) {
    setExpandedExplanations(new Set())
    setFullDetail({ loading: true, e1, e2, answers1: [], answers2: [] })
    const [r1, r2] = await Promise.all([
      supabase.from('exam_answers')
        .select('id, user_answer, is_correct, problem:problems(question, solution, explanation)')
        .eq('exam_id', e1.id),
      e2
        ? supabase.from('exam_answers')
            .select('id, user_answer, is_correct, problem:problems(question, solution, explanation)')
            .eq('exam_id', e2.id)
        : Promise.resolve({ data: [] }),
    ])
    setFullDetail({
      loading: false, e1, e2,
      answers1: (r1.data ?? []) as unknown as DetailAnswer[],
      answers2: ((r2 as any).data ?? []) as unknown as DetailAnswer[],
    })
  }

  function toggleExplanation(id: string) {
    setExpandedExplanations(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function startPart1() {
    const easy = pick(easyProblems, PART1_EASY, new Set())
    const medium = pick(mediumProblems, PART1_MEDIUM, new Set())
    const p1 = shuffle([...easy, ...medium])
    setPart1Problems(p1)
    setCurrent(0); setAnswers({}); setTimeLeft(EXAM_DURATION)
    setStartTime(Date.now()); submitted.current = false
    setPhase('part1_active')
  }

  function startPart2() {
    const usedIds = new Set(part1Problems.map(p => p.id))
    const highScore = (part1Result?.score ?? 0) >= PART1_THRESHOLD
    const p2 = highScore
      ? shuffle([...pick(hardProblems, PART2_HARD_HIGH, usedIds), ...pick(mediumProblems, PART2_MEDIUM_HIGH, usedIds)])
      : shuffle([...pick(mediumProblems, PART2_MEDIUM_LOW, usedIds), ...pick(hardProblems, PART2_HARD_LOW, usedIds)])
    setPart2Problems(p2)
    setCurrent(0); setAnswers({}); setTimeLeft(EXAM_DURATION)
    setStartTime(Date.now()); submitted.current = false
    setPhase('part2_active')
  }

  function fmtTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  /* ---- FULL DETAIL VIEW ---- */
  if (phase === 'idle' && fullDetail) {
    const { loading, e1, e2, answers1, answers2 } = fullDetail
    const PART_TOTAL = 22
    const pct1 = Math.round(e1.score / PART_TOTAL * 100)
    const pct2 = e2 ? Math.round(e2.score / PART_TOTAL * 100) : null
    const totalScore = e1.score + (e2?.score ?? 0)
    const combinedSat = toSatScore(totalScore, e2 ? PART_TOTAL * 2 : PART_TOTAL)
    const satColor = combinedSat >= 650 ? '#34D399' : combinedSat >= 450 ? '#FBBF24' : '#F87171'
    const color1 = pct1 >= 80 ? '#34D399' : pct1 >= 50 ? '#FBBF24' : '#F87171'
    const color2 = pct2 != null ? (pct2 >= 80 ? '#34D399' : pct2 >= 50 ? '#FBBF24' : '#F87171') : null

    return (
      <div>
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => setFullDetail(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-slate-300 transition-all hover:text-white"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={14} strokeWidth={2} /> Back
          </button>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
              Exam Results
            </h1>
            <p className="text-slate-400 mt-1">
              {new Date(e1.taken_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 size={20} className="animate-spin" /> Loading exam details…
          </div>
        ) : (
          <>
            {/* Score summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'SAT Score', value: combinedSat, from: satColor, to: satColor + '99' },
                { label: 'Total Correct', value: `${totalScore}/${e2 ? PART_TOTAL * 2 : PART_TOTAL}`, from: '#60A5FA', to: '#3B82F6' },
                { label: 'Part 1', value: `${e1.score}/${PART_TOTAL} (${pct1}%)`, from: color1, to: color1 + '99' },
                { label: 'Part 2', value: e2 && pct2 != null ? `${e2.score}/${PART_TOTAL} (${pct2}%)` : '—', from: color2 ?? '#94A3B8', to: (color2 ?? '#94A3B8') + '99' },
              ].map(s => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-white/10 p-5"
                  style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
                  <p
                    className="text-2xl font-extrabold tracking-tight"
                    style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Per-part question lists */}
            {([{ label: 'Part 1', record: e1, answers: answers1 }, { label: 'Part 2', record: e2, answers: answers2 }] as const).map(({ label, record, answers }) => {
              if (!record || answers.length === 0) return null
              const partPct = Math.round(record.score / PART_TOTAL * 100)
              return (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 overflow-hidden mb-6"
                  style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}
                >
                  <div className="px-7 py-5 border-b border-white/8 flex items-center justify-between">
                    <h2 className="font-extrabold text-white text-lg tracking-tight">{label} — {record.score}/{PART_TOTAL}</h2>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      {partPct}% correct
                    </span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {answers.map((a, i) => {
                      const prob = a.problem as any
                      const expanded = expandedExplanations.has(a.id)
                      return (
                        <div
                          key={a.id}
                          className="px-7 py-5"
                          style={a.is_correct
                            ? { borderLeft: '3px solid rgba(16,185,129,0.4)' }
                            : { borderLeft: '3px solid rgba(239,68,68,0.4)' }}
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <span
                              className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                              style={a.is_correct
                                ? { background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }
                                : { background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}
                            >
                              {i + 1}
                            </span>
                            <p className="text-sm text-slate-200 leading-relaxed flex-1">{prob?.question ?? '—'}</p>
                          </div>
                          <div className="ml-9 flex flex-wrap gap-6 text-xs text-slate-400 mb-3">
                            <span>
                              Your answer:{' '}
                              <span className={`font-bold ${a.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                                {a.user_answer || '—'}
                              </span>
                            </span>
                            <span>
                              Correct answer: <span className="font-bold text-slate-200">{prob?.solution ?? '—'}</span>
                            </span>
                          </div>
                          {prob?.explanation && (
                            <div className="ml-9">
                              <button
                                onClick={() => toggleExplanation(a.id)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                {expanded ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
                                {expanded ? 'Hide' : 'Show'} Solution
                              </button>
                              {expanded && (
                                <div
                                  className="mt-2 p-4 rounded-xl text-sm text-amber-100/90 leading-relaxed"
                                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
                                >
                                  {prob.explanation}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    )
  }

  /* ---- IDLE ---- */
  if (phase === 'idle') {
    const isLimited = !isSubscribed && examCount >= FREE_EXAM_LIMIT
    const examPairs = examHistory.filter(e => e.part === 1)

    return (
      <div>
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
            Exam
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Adaptive SAT practice exam</p>
        </div>

        <div className="mb-10">
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
              <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400 mb-5">
                <span className="inline-flex items-center gap-2"><FileText size={16} strokeWidth={1.75} className="text-blue-400" /> 2 parts · 22 questions each</span>
                <span className="inline-flex items-center gap-2"><Timer size={16} strokeWidth={1.75} className="text-blue-400" /> 35 min per part</span>
              </div>
              {!isSubscribed && (
                <p className="text-xs text-slate-500 mb-4">
                  Free plan: {examCount}/{FREE_EXAM_LIMIT} exams used
                </p>
              )}

              {isLimited ? (
                <Link
                  href="/student/subscription"
                  className="w-full inline-flex items-center justify-center gap-2 py-4 font-bold text-white rounded-full text-base transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', boxShadow: '0 12px 30px rgba(99,102,241,0.4)' }}
                >
                  <Lock size={16} strokeWidth={2} /> Unlock More with Pro
                </Link>
              ) : (
                <button
                  onClick={startPart1}
                  disabled={easyProblems.length + mediumProblems.length < PART1_EASY + PART1_MEDIUM}
                  className="w-full inline-flex items-center justify-center gap-2 py-4 font-bold text-white rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-base"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 12px 30px rgba(59,130,246,0.4)' }}
                >
                  Start Exam <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Exam History */}
        {examHistory.length > 0 && (
          <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
          >
            <div className="px-7 py-5 border-b border-white/8">
              <h2 className="font-extrabold text-white text-lg tracking-tight">Exam Records</h2>
            </div>
            <div className="divide-y divide-white/5">
              {examPairs.map(e1 => {
                const e2 = examHistory.find(e =>
                  e.part === 2 &&
                  new Date(e.taken_at).toDateString() === new Date(e1.taken_at).toDateString()
                )
                const pct1 = Math.round(e1.score / e1.total * 100)
                const pct2 = e2 ? Math.round(e2.score / e2.total * 100) : null
                const color1 = pct1 >= 80 ? '#34D399' : pct1 >= 50 ? '#FBBF24' : '#F87171'
                const color2 = pct2 != null ? (pct2 >= 80 ? '#34D399' : pct2 >= 50 ? '#FBBF24' : '#F87171') : null
                const totalScore = e1.score + (e2?.score ?? 0)
                const totalQ = e1.total + (e2?.total ?? 0)
                const sat = toSatScore(totalScore, totalQ)
                const satColor = sat >= 650 ? '#34D399' : sat >= 450 ? '#FBBF24' : '#F87171'

                return (
                  <div key={e1.id} className="px-7 py-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          {new Date(e1.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums" style={{ background: `${color1}1a`, color: color1, border: `1px solid ${color1}40` }}>
                          P1 {e1.score}/{e1.total}
                        </span>
                        {e2 && color2 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums" style={{ background: `${color2}1a`, color: color2, border: `1px solid ${color2}40` }}>
                            P2 {e2.score}/{e2.total}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => openDetail(e1, e2)}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
                      >
                        View Details
                      </button>
                    </div>
                    <div className="flex gap-8 text-sm">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Part 1</span>
                        <p className="font-extrabold tabular-nums" style={{ color: color1 }}>{e1.score}/{e1.total} ({pct1}%)</p>
                        <div className="w-24 bg-white/5 rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct1}%`, background: color1 }} />
                        </div>
                      </div>
                      {e2 && color2 && pct2 != null && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Part 2</span>
                          <p className="font-extrabold tabular-nums" style={{ color: color2 }}>{e2.score}/{e2.total} ({pct2}%)</p>
                          <div className="w-24 bg-white/5 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div className="h-1.5 rounded-full" style={{ width: `${pct2}%`, background: color2 }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ---- PART 1 DONE ---- */
  if (phase === 'part1_done' && part1Result) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">Part 1 Complete</h1>
          <p className="text-slate-400 mt-2">Results will be shown after Part 2.</p>
        </div>
        <div
          className="rounded-2xl border border-white/10 overflow-hidden mb-6"
          style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}
        >
          <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #60A5FA, #6366F1)' }} />
          <div className="p-8 text-center">
            <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-slate-400 mb-8">
              <span className="inline-flex items-center gap-2"><FileText size={16} strokeWidth={1.75} className="text-blue-400" /> 22 questions</span>
              <span className="inline-flex items-center gap-2"><Timer size={16} strokeWidth={1.75} className="text-blue-400" /> 35 min</span>
            </div>
            <button
              onClick={startPart2}
              className="w-full py-4 font-bold text-white rounded-full text-base transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 12px 30px rgba(59,130,246,0.4)' }}
            >
              Start Part 2 <ArrowRight size={16} strokeWidth={2.5} className="inline ml-1" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---- FINAL RESULTS ---- */
  if (phase === 'final' && part1Result && part2Result) {
    const PART_TOTAL = 22
    const totalScore = part1Result.score + part2Result.score
    const totalQuestions = PART_TOTAL * 2
    const combinedSat = toSatScore(totalScore, totalQuestions)
    const satColor = combinedSat >= 650 ? '#34D399' : combinedSat >= 450 ? '#FBBF24' : '#F87171'

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
            Exam Results
          </h1>
        </div>

        <div
          className="rounded-2xl border border-white/10 overflow-hidden mb-6"
          style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}
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
              {combinedSat}
            </div>
            <p className="text-slate-500 text-sm mb-6">out of 800</p>

            <div className="flex items-center justify-center gap-6 text-sm mb-6">
              <div className="text-center">
                <p className="font-extrabold text-white text-xl">{totalScore}/{totalQuestions}</p>
                <p className="text-slate-500 text-xs mt-0.5 uppercase tracking-widest">Total Correct</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="font-extrabold text-white text-xl">{part1Result.score}/{PART_TOTAL}</p>
                <p className="text-slate-500 text-xs mt-0.5 uppercase tracking-widest">Part 1</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="font-extrabold text-white text-xl">{part2Result.score}/{PART_TOTAL}</p>
                <p className="text-slate-500 text-xs mt-0.5 uppercase tracking-widest">Part 2</p>
              </div>
            </div>

            <button
              onClick={() => { setPhase('idle'); setPart1Result(null); setPart2Result(null) }}
              className="px-8 py-3 font-bold text-white rounded-full text-sm transition-all duration-200 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}
            >
              Done
            </button>
          </div>
        </div>

        {[{ label: 'Part 1', result: part1Result }, { label: 'Part 2', result: part2Result }].map(({ label, result }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 overflow-hidden mb-4"
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}
          >
            <div className="px-7 py-5 border-b border-white/8">
              <h2 className="font-extrabold text-white tracking-tight">{label} Breakdown</h2>
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
        ))}
      </div>
    )
  }

  /* ---- ACTIVE EXAM ---- */
  const problem = activeProblems[current]
  const urgentTime = timeLeft <= 120
  const answeredCount = Object.keys(answers).length
  const partLabel = activePart === 1 ? 'Part 1' : 'Part 2'

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">SAT Practice — {partLabel}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{answeredCount} of {activeProblems.length} answered</p>
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
            width: `${((current + 1) / activeProblems.length) * 100}%`,
            background: 'linear-gradient(90deg, #60A5FA, #6366F1)',
            boxShadow: '0 0 12px rgba(96,165,250,0.6)',
          }}
        />
      </div>

      {problem && (
        <div
          className="rounded-2xl border border-white/10 p-7 md:p-9 mb-5"
          style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <span className="text-sm font-bold text-slate-500">Q{current + 1}</span>
            <span className="text-[11px] px-2.5 py-1 rounded-full font-bold capitalize" style={diffStyle(problem.difficulty)}>
              {problem.difficulty}
            </span>
            {problem.category && (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(59,130,246,0.1)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.2)' }}>
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
        >
          <ArrowLeft size={14} strokeWidth={2} /> Prev
        </button>

        {current < activeProblems.length - 1 ? (
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
              const unanswered = activeProblems.length - Object.keys(answers).length
              if (unanswered > 0 && !confirm(`${unanswered} unanswered question(s). Submit anyway?`)) return
              submitActivePart()
            }}
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 font-bold text-white rounded-full text-sm transition-all duration-200 hover:scale-[1.01] disabled:opacity-60 min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" /> Submitting…</>
            ) : (
              <>{activePart === 1 ? 'Submit Part 1' : 'Submit Exam'} <Check size={14} strokeWidth={2.5} /></>
            )}
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {activeProblems.map((_, i) => (
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
