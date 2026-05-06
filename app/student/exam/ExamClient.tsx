'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FileText, Timer, ArrowLeft, ArrowRight, Check, X, Loader2, Lock, Award } from 'lucide-react'
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
  problem?: {
    id: string
    question: string
    solution: string
    explanation?: string | null
    image_url?: string | null
    difficulty?: string
    category?: string | null
    topic?: string | null
    type?: string
  }
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
  const [reviewItem, setReviewItem] = useState<{ answer: DetailAnswer; partLabel: string; rowNum: number } | null>(null)
  const [detailLightbox, setDetailLightbox] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [examImageExpanded, setExamImageExpanded] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const submitted = useRef(false)
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    setExamImageExpanded(false)
    setImageLoaded(false)
  }, [current])

  // Toggle modal-open class so globals.css blurs the app behind the overlay
  useEffect(() => {
    const active = phase === 'part1_active' || phase === 'part2_active'
    if (active) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => document.body.classList.remove('modal-open')
  }, [phase])

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
    setFullDetail({ loading: true, e1, e2, answers1: [], answers2: [] })
    try {
      const [r1, r2] = await Promise.all([
        supabase.from('exam_answers')
          .select('id, user_answer, is_correct, problem:problems(id, question, solution, explanation, image_url, difficulty, category, topic, type)')
          .eq('exam_id', e1.id),
        e2
          ? supabase.from('exam_answers')
              .select('id, user_answer, is_correct, problem:problems(id, question, solution, explanation, image_url, difficulty, category, topic, type)')
              .eq('exam_id', e2.id)
          : Promise.resolve({ data: [] }),
      ])
      setFullDetail({
        loading: false, e1, e2,
        answers1: (r1.data ?? []) as unknown as DetailAnswer[],
        answers2: ((r2 as any).data ?? []) as unknown as DetailAnswer[],
      })
    } catch {
      setFullDetail(prev => prev ? { ...prev, loading: false } : null)
    }
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
    const hardPick = pick(hardProblems, highScore ? PART2_HARD_HIGH : PART2_HARD_LOW, usedIds)
    const mediumPick = pick(mediumProblems, highScore ? PART2_MEDIUM_HIGH : PART2_MEDIUM_LOW, usedIds)
    let p2 = shuffle([...hardPick, ...mediumPick])
    if (p2.length < 22) {
      const pickedIds = new Set(p2.map(p => p.id))
      const fillers = shuffle([...hardProblems, ...mediumProblems].filter(p => !pickedIds.has(p.id)))
      p2 = [...p2, ...fillers.slice(0, 22 - p2.length)]
    }
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
    const parts = [
      { label: 'Part 1', record: e1, answers: answers1 },
      { label: 'Part 2', record: e2, answers: answers2 },
    ] as const

    // Normalize Supabase array-or-object join shape
    function prob(a: DetailAnswer) {
      return (Array.isArray(a.problem) ? (a.problem as any)[0] : a.problem) as DetailAnswer['problem']
    }

    return (
      <div>
        {/* ── Review modal portal ── */}
        {reviewItem && mounted && createPortal(
          <>
            <div
              className="fixed inset-0 z-50 flex items-center justify-center md:bg-black/80 md:backdrop-blur-sm md:p-6"
              onClick={() => { setReviewItem(null); setDetailLightbox(false) }}
            >
              <div
                className="flex flex-col overflow-hidden w-full h-full rounded-none md:rounded-2xl md:w-[92vw] md:max-w-[1200px] md:h-[88vh]"
                onClick={e => e.stopPropagation()}
                style={{ background: 'var(--app-bg-alt)', border: '1px solid var(--card-border)', boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}
              >
                {/* Header */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
                  style={{ borderBottom: '1px solid var(--card-border)' }}
                >
                  <span
                    className="font-mono font-bold text-xs flex-shrink-0"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 6 }}
                  >
                    Q{reviewItem.rowNum}
                  </span>
                  {prob(reviewItem.answer)?.difficulty && (
                    <span
                      className="flex-shrink-0 text-[10px] font-bold capitalize"
                      style={{ ...diffStyle(prob(reviewItem.answer)!.difficulty!), padding: '2px 10px', borderRadius: 999 }}
                    >
                      {prob(reviewItem.answer)!.difficulty}
                    </span>
                  )}
                  {prob(reviewItem.answer)?.category && (
                    <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {[prob(reviewItem.answer)?.category, prob(reviewItem.answer)?.topic].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  <span
                    className="ml-auto text-xs font-semibold flex-shrink-0"
                    style={{ color: reviewItem.answer.is_correct ? '#34D399' : '#F87171' }}
                  >
                    {reviewItem.answer.is_correct ? 'Correct' : 'Incorrect'} · {reviewItem.partLabel}
                  </span>
                  <button
                    onClick={() => { setReviewItem(null); setDetailLightbox(false) }}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Body — same 62/38 split as ProblemsClient */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
                  {/* Left: problem image */}
                  <div className="h-[52%] overflow-y-auto md:h-full md:w-[62%] md:flex-none border-b border-white/[0.08] md:border-b-0 md:border-r md:border-white/[0.08]">
                    {prob(reviewItem.answer)?.image_url ? (
                      <div className="h-full flex flex-col">
                        <img
                          src={prob(reviewItem.answer)!.image_url!}
                          alt="Problem"
                          className="flex-1 w-full object-contain cursor-zoom-in min-h-0"
                          onClick={() => setDetailLightbox(true)}
                        />
                        <p className="text-center text-xs py-1.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                          click to expand
                        </p>
                      </div>
                    ) : prob(reviewItem.answer)?.question ? (
                      <p className="p-6 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {prob(reviewItem.answer)!.question}
                      </p>
                    ) : (
                      <div
                        className="m-6 rounded-xl flex items-center justify-center text-sm"
                        style={{ minHeight: 180, border: '2px dashed var(--card-border)', color: 'var(--text-muted)' }}
                      >
                        No image available
                      </div>
                    )}
                  </div>

                  {/* Right: review info */}
                  <div className="flex-1 min-h-0 overflow-y-auto md:flex-none md:h-full md:w-[38%] p-5 md:p-6 flex flex-col gap-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                        Your Answer
                      </p>
                      <p className="text-2xl font-bold font-mono" style={{ color: reviewItem.answer.is_correct ? '#34D399' : '#F87171' }}>
                        {reviewItem.answer.user_answer || '—'}
                      </p>
                    </div>

                    {!reviewItem.answer.is_correct && prob(reviewItem.answer)?.solution && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          Correct Answer
                        </p>
                        <p className="text-2xl font-bold font-mono text-emerald-400">
                          {prob(reviewItem.answer)!.solution}
                        </p>
                      </div>
                    )}

                    {prob(reviewItem.answer)?.explanation && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                          Solution
                        </p>
                        <div className="rounded-xl p-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            {prob(reviewItem.answer)!.explanation}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Lightbox */}
            {detailLightbox && prob(reviewItem.answer)?.image_url && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center cursor-zoom-out"
                style={{ background: 'rgba(0,0,0,0.92)' }}
                onClick={() => setDetailLightbox(false)}
              >
                <img
                  src={prob(reviewItem.answer)!.image_url!}
                  alt="Problem expanded"
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            )}
          </>,
          document.body
        )}

        {/* ── Back + title ── */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => setFullDetail(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={14} strokeWidth={2} /> Back
          </button>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Exam Results
            </h1>
            <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
              {new Date(e1.taken_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── Score summary cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'SAT Score', value: combinedSat, from: satColor, to: satColor + '99' },
            { label: 'Total Correct', value: `${totalScore}/${e2 ? PART_TOTAL * 2 : PART_TOTAL}`, from: '#60A5FA', to: '#3B82F6' },
            { label: 'Part 1', value: `${e1.score}/${PART_TOTAL} (${pct1}%)`, from: color1, to: color1 + '99' },
            { label: 'Part 2', value: e2 && pct2 != null ? `${e2.score}/${PART_TOTAL} (${pct2}%)` : '—', from: color2 ?? '#94A3B8', to: (color2 ?? '#94A3B8') + '99' },
          ].map(s => (
            <div key={s.label} className="c-card rounded-2xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p
                className="text-2xl font-extrabold tracking-tight"
                style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Per-part tables ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" /> Loading exam details…
          </div>
        ) : (
          <>
            {parts.map(({ label, record, answers: partAnswers }) => {
              if (!record) return null
              const partPct = Math.round(record.score / PART_TOTAL * 100)
              return (
                <div key={label} className="rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
                  {/* Part header */}
                  <div
                    className="px-5 py-3 flex items-center justify-between"
                    style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--table-header-bg)' }}
                  >
                    <h2 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      {label} — {record.score}/{PART_TOTAL}
                    </h2>
                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {partPct}% correct
                    </span>
                  </div>

                  {/* Column headers — identical to ProblemsClient */}
                  <div
                    className="hidden md:grid items-center px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest select-none"
                    style={{
                      gridTemplateColumns: '2.5rem 5.5rem 1fr 13rem 5rem',
                      gap: '0.75rem',
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--card-border)',
                      background: 'var(--table-header-bg)',
                    }}
                  >
                    <span className="text-right">#</span>
                    <span>Difficulty</span>
                    <span>Question</span>
                    <span>Domain · Topic</span>
                    <span className="text-right">Status</span>
                  </div>

                  {partAnswers.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No answer data available for this exam.
                    </div>
                  ) : (
                    partAnswers.map((a, i) => {
                      const p = prob(a)
                      return (
                        <div
                          key={a.id}
                          onClick={() => setReviewItem({ answer: a, partLabel: label, rowNum: i + 1 })}
                          className="flex md:grid items-center px-5 py-3.5 cursor-pointer transition-colors gap-3"
                          style={{
                            gridTemplateColumns: '2.5rem 5.5rem 1fr 13rem 5rem',
                            borderBottom: '1px solid var(--card-border)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--table-row-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                        >
                          {/* # */}
                          <span className="hidden md:block text-right text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {i + 1}
                          </span>

                          {/* Difficulty */}
                          <div className="flex-shrink-0">
                            {p?.difficulty ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={diffStyle(p.difficulty)}>
                                {p.difficulty}
                              </span>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </div>

                          {/* Question — short ID */}
                          <p className="flex-1 min-w-0 text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                            {p?.id ? p.id.slice(0, 8) : '—'}
                          </p>

                          {/* Domain · Topic */}
                          <p className="hidden md:block text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {[p?.category, p?.topic].filter(Boolean).join(' · ') || '—'}
                          </p>

                          {/* Status */}
                          <div className="flex items-center justify-end flex-shrink-0">
                            {a.is_correct
                              ? <Check size={13} strokeWidth={2.5} className="text-emerald-500" />
                              : <X size={13} strokeWidth={2.5} className="text-red-400" />
                            }
                          </div>
                        </div>
                      )
                    })
                  )}
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

    // Compute highest SAT score from all completed exam pairs
    let highestSat: { score: number; date: string } | null = null
    for (const e1 of examPairs) {
      const e2 = examHistory.find(e =>
        e.part === 2 &&
        new Date(e.taken_at).toDateString() === new Date(e1.taken_at).toDateString()
      )
      const totalScore = e1.score + (e2?.score ?? 0)
      const totalQ = e1.total + (e2?.total ?? 0)
      const sat = toSatScore(totalScore, totalQ)
      if (!highestSat || sat > highestSat.score) {
        highestSat = { score: sat, date: e1.taken_at }
      }
    }

    return (
      <div>
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
            Exam
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Adaptive SAT practice exam</p>
        </div>

        <div className="mb-10">
          <div className="c-card rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 60px rgba(59,130,246,0.08)' }}>
            <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #60A5FA, #6366F1)' }} />
            <div className="p-8">
              <h2 className="text-2xl font-extrabold text-white mb-3 tracking-tight">SAT Math Practice</h2>
              <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400 mb-5">
                <span className="inline-flex items-center gap-2"><FileText size={16} strokeWidth={1.75} className="text-blue-400" /> 2 parts · 22 questions each</span>
                <span className="inline-flex items-center gap-2"><Timer size={16} strokeWidth={1.75} className="text-blue-400" /> 35 min per part</span>
              </div>
              {highestSat && (
                <div
                  className="flex items-center gap-3 mb-5 p-3.5 rounded-xl"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
                >
                  <Award size={18} strokeWidth={1.75} style={{ color: '#FBBF24', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-white">Highest SAT Score: </span>
                    <span
                      className="text-sm font-extrabold"
                      style={{
                        background: highestSat.score >= 650 ? 'linear-gradient(135deg, #34D399, #10B981)' : highestSat.score >= 450 ? 'linear-gradient(135deg, #FBBF24, #F59E0B)' : 'linear-gradient(135deg, #F87171, #EF4444)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {highestSat.score}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {new Date(highestSat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}

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

        {examHistory.length > 0 && (
          <div className="c-card rounded-2xl overflow-hidden">
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
        <div className="c-card rounded-2xl overflow-hidden mb-6">
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

        <div className="c-card rounded-2xl overflow-hidden mb-6">
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
          <div key={label} className="c-card rounded-2xl overflow-hidden mb-4">
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
  const sortedChoices = (problem?.choices ?? []).sort((a, b) => a.order_index - b.order_index)
  const selectedAnswer = answers[current] ?? null
  const isLastQuestion = current === activeProblems.length - 1

  if (!mounted) return null

  const overlay = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--app-bg)',
        color: 'var(--text-primary)',
      }}
    >
      {/* ── Full-screen image viewer ── */}
      {examImageExpanded && problem?.image_url && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: '#000', display: 'flex', flexDirection: 'column' }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 12px', background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}
          >
            <button
              onClick={() => setExamImageExpanded(false)}
              style={{ padding: 8, borderRadius: 8, background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
          <div
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'zoom-out' }}
            onClick={() => setExamImageExpanded(false)}
          >
            <img
              src={problem.image_url}
              alt="Problem"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#475569', padding: '6px 0', flexShrink: 0 }}>
            click to close
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <div
        style={{
          height: 52,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 20px',
          borderBottom: '1px solid var(--card-border)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          SAT Practice — {partLabel}
        </span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 700,
            background: 'var(--input-bg)',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          {current + 1}/{activeProblems.length}
        </span>
        {problem && (
          <span
            style={{
              ...diffStyle(problem.difficulty),
              padding: '2px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'capitalize',
              flexShrink: 0,
            }}
          >
            {problem.difficulty}
          </span>
        )}
        {problem?.category && (
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {problem.category}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {answeredCount}/{activeProblems.length} answered
          </span>
          <div
            style={urgentTime
              ? { background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.4)', padding: '5px 14px', borderRadius: 999, fontFamily: 'monospace', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }
              : { background: 'var(--input-bg)', color: '#3B82F6', border: '1px solid var(--input-border)', padding: '5px 14px', borderRadius: 999, fontFamily: 'monospace', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {urgentTime && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F87171', flexShrink: 0, animation: 'pulse 1s infinite' }} />
            )}
            {fmtTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: 2, background: 'var(--input-bg)', flexShrink: 0 }}>
        <div
          style={{
            height: '100%',
            width: `${((current + 1) / activeProblems.length) * 100}%`,
            background: 'linear-gradient(90deg, #3B82F6, #6366F1)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* ── Problem area ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {problem ? (
          <>
            {/* Left: question image or text */}
            <div
              style={{
                width: '60%',
                borderRight: '1px solid var(--card-border)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {problem.image_url ? (
                <>
                  {!imageLoaded && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '72%', height: '60%', borderRadius: 12, background: 'var(--input-bg)', animation: 'pulse 1.4s ease-in-out infinite' }} />
                    </div>
                  )}
                  <div
                    style={{ flex: 1, display: imageLoaded ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'zoom-in' }}
                    onClick={() => setExamImageExpanded(true)}
                  >
                    <img
                      src={problem.image_url}
                      alt="Problem"
                      onLoad={() => setImageLoaded(true)}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                  {imageLoaded && (
                    <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '6px 0', flexShrink: 0 }}>
                      click to expand
                    </p>
                  )}
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 24 }}>
                  <div style={{ width: '100%', borderRadius: 12, border: '2px dashed var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, color: 'var(--text-muted)', fontSize: 14 }}>
                    No image available
                  </div>
                </div>
              )}
            </div>

            {/* Right: answer + Next/Submit */}
            <div
              style={{
                width: '40%',
                display: 'flex',
                flexDirection: 'column',
                padding: '36px 40px',
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--text-muted)',
                  marginBottom: 20,
                }}
              >
                Your Answer
              </p>

              {/* MC: A/B/C/D buttons */}
              {problem.type === 'mc' && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {sortedChoices.map(c => {
                    const sel = selectedAnswer === c.label
                    return (
                      <button
                        key={c.id}
                        onClick={() => setAnswers(a => ({ ...a, [current]: c.label }))}
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 12,
                          border: sel ? '2px solid #3B82F6' : '2px solid var(--input-border)',
                          color: sel ? '#3B82F6' : 'var(--text-muted)',
                          background: sel ? 'rgba(59,130,246,0.12)' : 'var(--input-bg)',
                          fontSize: 17,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Input: text box */}
              {problem.type === 'input' && (
                <div>
                  <input
                    type="text"
                    value={answers[current] ?? ''}
                    onChange={e => setAnswers(a => ({ ...a, [current]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !isLastQuestion) setCurrent(c => c + 1)
                    }}
                    placeholder="Enter your answer"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      borderRadius: 12,
                      background: 'var(--input-bg)',
                      border: '2px solid #3B82F6',
                      color: 'var(--text-primary)',
                      fontSize: 15,
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    fraction · decimal · integer
                  </p>
                </div>
              )}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Next / Submit button */}
              {isLastQuestion ? (
                <button
                  onClick={() => {
                    const unanswered = activeProblems.length - Object.keys(answers).length
                    if (unanswered > 0 && !confirm(`${unanswered} unanswered question(s). Submit anyway?`)) return
                    submitActivePart()
                  }}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: 999,
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'white',
                    background: submitting ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #10B981, #059669)',
                    boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {submitting
                    ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                    : <>{activePart === 1 ? 'Submit Part 1' : 'Submit Exam'} <Check size={15} strokeWidth={2.5} /></>
                  }
                </button>
              ) : (
                <button
                  onClick={() => setCurrent(c => c + 1)}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: 999,
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'white',
                    background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                    boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  Next <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No problems available for this exam.
          </div>
        )}
      </div>

      {/* ── Bottom nav: Prev | 1-22 number grid ── */}
      <div
        style={{
          height: 60,
          flexShrink: 0,
          borderTop: '1px solid var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
        }}
      >
        <button
          onClick={() => setCurrent(c => c - 1)}
          disabled={current === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 14px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            color: 'var(--text-primary)',
            cursor: current === 0 ? 'not-allowed' : 'pointer',
            opacity: current === 0 ? 0.3 : 1,
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={13} strokeWidth={2} /> Prev
        </button>

        {/* Scrollable number chips */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: 5,
            alignItems: 'center',
            overflowX: 'auto',
            padding: '2px 0',
          }}
        >
          {activeProblems.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={
                i === current
                  ? { width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700, flexShrink: 0, background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: 'white', boxShadow: '0 0 10px rgba(59,130,246,0.45)', border: 'none', cursor: 'pointer' }
                  : i in answers
                    ? { width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700, flexShrink: 0, background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer' }
                    : { width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700, flexShrink: 0, background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)', cursor: 'pointer' }
              }
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
