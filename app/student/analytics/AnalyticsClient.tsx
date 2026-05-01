'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

interface Props {
  attempts: { is_correct: boolean; attempted_at: string }[]
  exams: ExamRecord[]
  totalAttempts: number
  correctAttempts: number
  totalExamAnswers: number
  correctExamAnswers: number
  isSubscribed: boolean
}

export default function AnalyticsClient({
  attempts, exams, totalAttempts, correctAttempts, totalExamAnswers, correctExamAnswers, isSubscribed,
}: Props) {
  const [examDetail, setExamDetail] = useState<ExamRecord | null>(null)
  const [examAnswers, setExamAnswers] = useState<ExamAnswer[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const supabase = createClient()

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
    { label: 'Problems Tried',  value: totalAttempts,         from: '#60A5FA', to: '#3B82F6' },
    { label: 'Problems Solved', value: correctAttempts,        from: '#34D399', to: '#10B981' },
    { label: 'Problem Accuracy',value: `${problemAccuracy}%`, from: '#A78BFA', to: '#7C3AED' },
    { label: 'Exams Taken',     value: exams.length,          from: '#FBBF24', to: '#F59E0B' },
    { label: 'Exam Accuracy',   value: `${examAccuracy}%`,    from: '#F87171', to: '#EF4444' },
  ]

  async function openExamDetail(exam: ExamRecord) {
    setExamDetail(exam)
    setLoadingDetail(true)
    const { data } = await supabase
      .from('exam_answers')
      .select('id, user_answer, is_correct, problem:problems(question, solution)')
      .eq('exam_id', exam.id)
    setExamAnswers((data ?? []) as unknown as ExamAnswer[])
    setLoadingDetail(false)
  }

  const premiumContent = (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {STATS.map(s => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 p-5 transition-all duration-300"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
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

      {/* Activity Chart */}
      <div
        className="rounded-2xl border border-white/10 p-7 mb-8"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
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
                      : 'rgba(255,255,255,0.04)',
                  boxShadow: d.count > 0 ? (d.isToday ? '0 0 12px rgba(167,139,250,0.5)' : '0 0 12px rgba(96,165,250,0.4)') : 'none',
                }}
              />
              {d.count > 0 && (
                <div
                  className="absolute -top-9 left-1/2 -translate-x-1/2 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10"
                  style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {d.count} · {d.date.slice(5)}
                </div>
              )}
            </div>
          ))}
        </div>
        {/* X-axis: all days of the month */}
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
    </>
  )

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Analytics
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Your performance at a glance</p>
      </div>

      {/* Exam detail modal */}
      {examDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 py-8 px-4 fade-in" onClick={() => setExamDetail(null)}>
          <div
            className="rounded-2xl w-full max-w-2xl p-7 zoom-in-95 max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0F172A',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)',
            }}
          >
            <div className="flex items-start justify-between mb-5 shrink-0">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Part {examDetail.part} Breakdown
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {examDetail.score}/{examDetail.total} · {new Date(examDetail.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setExamDetail(null)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all ml-4">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            {loadingDetail ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm">Loading…</div>
            ) : (
              <div className="overflow-y-auto space-y-2 flex-1 pr-1">
                {examAnswers.map((a, i) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl"
                    style={a.is_correct
                      ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }
                      : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={a.is_correct
                          ? { background: 'rgba(16,185,129,0.2)', color: '#34D399' }
                          : { background: 'rgba(239,68,68,0.2)', color: '#F87171' }}
                      >
                        {a.is_correct ? <Check size={11} strokeWidth={2.5} /> : <X size={11} strokeWidth={2.5} />}
                      </span>
                      <p className="text-sm font-semibold text-slate-200">Q{i + 1}: {(a.problem as any)?.question?.slice(0, 80)}…</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 ml-7">
                      Your answer: <span className={a.is_correct ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{a.user_answer || '—'}</span>
                      {!a.is_correct && <> · Correct: <span className="text-slate-300 font-semibold">{(a.problem as any)?.solution}</span></>}
                    </p>
                  </div>
                ))}
                {examAnswers.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No answers recorded.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {isSubscribed ? (
        premiumContent
      ) : (
        <div className="relative mb-8">
          <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.4 }}>
            {premiumContent}
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
                Get detailed performance insights, charts, and full analytics with a Pro subscription.
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
      )}

      {/* Exam history — visible to all users */}
      <div
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        <div className="px-7 py-5 border-b border-white/8">
          <h2 className="font-extrabold text-white text-lg tracking-tight">Exam History</h2>
        </div>
        {exams.length === 0 ? (
          <div className="px-7 py-14 text-center text-slate-500 text-sm">No exams taken yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {exams.map((e) => {
              const pct = Math.round(e.score / e.total * 100)
              const color = pct >= 80 ? '#34D399' : pct >= 50 ? '#FBBF24' : '#F87171'
              return (
                <div key={e.id} className="px-7 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-slate-300">
                        Part {e.part} · {new Date(e.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="font-extrabold tabular-nums" style={{ color }}>
                        {e.score}/{e.total} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}66` }} />
                    </div>
                  </div>
                  <button
                    onClick={() => openExamDetail(e)}
                    className="text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors shrink-0"
                  >
                    Details
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
