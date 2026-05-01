'use client'

import { useState } from 'react'
import { X, Loader2, FileText, Timer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Dropdown from '@/components/ui/Dropdown'
import type { ExamAnswer } from '@/types'

interface ExamRow {
  id: string
  part: number
  score: number
  total: number
  duration_s: number
  taken_at: string
  user: { id: string; name: string | null; email: string } | null
}

export default function ExamTrackerClient({ initialExams }: { initialExams: ExamRow[] }) {
  const [exams] = useState<ExamRow[]>(initialExams)
  const [selectedExam, setSelectedExam] = useState<ExamRow | null>(null)
  const [pairedExam, setPairedExam] = useState<ExamRow | null>(null)
  const [answers, setAnswers] = useState<ExamAnswer[]>([])
  const [pairedAnswers, setPairedAnswers] = useState<ExamAnswer[]>([])
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  const [filterUser, setFilterUser] = useState('all')

  const supabase = createClient()

  async function openDetail(exam: ExamRow) {
    const otherPart = exam.part === 1 ? 2 : 1
    const pair = exams.find(e =>
      e.user?.id === exam.user?.id &&
      e.part === otherPart &&
      new Date(e.taken_at).toDateString() === new Date(exam.taken_at).toDateString()
    ) ?? null

    const e1 = exam.part === 1 ? exam : (pair ?? null)
    const e2 = exam.part === 2 ? exam : (pair ?? null)

    setSelectedExam(e1 ?? exam)
    setPairedExam(e2)
    setAnswers([])
    setPairedAnswers([])
    setLoadingAnswers(true)

    const fetches = [
      supabase.from('exam_answers').select('*, problem:problems(question, solution)').eq('exam_id', (e1 ?? exam).id),
      e2 ? supabase.from('exam_answers').select('*, problem:problems(question, solution)').eq('exam_id', e2.id) : Promise.resolve({ data: [] }),
    ]
    const [r1, r2] = await Promise.all(fetches)
    setAnswers((r1.data ?? []) as ExamAnswer[])
    setPairedAnswers(((r2 as any).data ?? []) as ExamAnswer[])
    setLoadingAnswers(false)
  }

  const users = Array.from(new Map(
    exams.filter(e => e.user).map(e => [e.user!.id, e.user!])
  ).values())

  const displayed = filterUser === 'all' ? exams : exams.filter(e => e.user?.id === filterUser)

  function fmtDuration(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Exam Tracker
        </h1>
        <Dropdown
          value={filterUser}
          onChange={setFilterUser}
          options={[
            { value: 'all', label: 'All students' },
            ...users.map(u => ({ value: u.id, label: u.name ?? u.email })),
          ]}
        />
      </div>

      {selectedExam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8 px-4 fade-in" onClick={() => { setSelectedExam(null); setPairedExam(null) }}>
          <div
            className="rounded-2xl w-full max-w-2xl p-7 zoom-in-95"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0F172A',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  {selectedExam.user?.name ?? selectedExam.user?.email}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(selectedExam.taken_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => { setSelectedExam(null); setPairedExam(null) }} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {/* Part 1 / Part 2 summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Part 1', exam: selectedExam, answersData: answers },
                { label: 'Part 2', exam: pairedExam, answersData: pairedAnswers },
              ].map(({ label, exam: ex, answersData }) => {
                const pct = ex ? Math.round(ex.score / ex.total * 100) : null
                const color = pct != null ? (pct >= 80 ? '#34D399' : pct >= 50 ? '#FBBF24' : '#F87171') : '#475569'
                return (
                  <div
                    key={label}
                    className="rounded-xl border border-white/10 p-4"
                    style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))' }}
                  >
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
                    <p className="text-lg font-extrabold mb-1" style={{ color }}>
                      {ex ? `${ex.score}/${ex.total}` : '—'}
                    </p>
                    <div className="flex gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1"><FileText size={11} strokeWidth={1.75} /> 22 questions</span>
                      <span className="inline-flex items-center gap-1"><Timer size={11} strokeWidth={1.75} /> 35 min</span>
                    </div>
                    {ex && (
                      <p className="text-[11px] text-slate-500 mt-1">{fmtDuration(ex.duration_s)} taken</p>
                    )}
                  </div>
                )
              })}
            </div>

            {loadingAnswers ? (
              <div className="flex items-center justify-center py-10 gap-3 text-slate-400 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading…
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-6">
                {[{ label: 'Part 1', data: answers }, { label: 'Part 2', data: pairedAnswers }].map(({ label, data }) => {
                  if (data.length === 0) return null
                  return (
                    <div key={label}>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label} — Questions</p>
                      <div className="space-y-2">
                        {data.map((a, i) => (
                          <div
                            key={a.id}
                            className="p-4 rounded-xl"
                            style={a.is_correct
                              ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }
                              : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                          >
                            <p className="text-sm font-semibold text-slate-200">Q{i + 1}: {(a.problem as any)?.question}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Answer: <span className={a.is_correct ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{a.user_answer}</span>
                            </p>
                            {!a.is_correct && <p className="text-xs text-slate-500 mt-0.5">Correct: <span className="text-slate-300 font-semibold">{(a.problem as any)?.solution}</span></p>}
                          </div>
                        ))}
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

      <div
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <tr>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Student</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Part</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Score</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Duration</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Date</th>
              <th className="px-5 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(e => {
              const pct = e.score / e.total
              const color = pct >= 0.8 ? '#34D399' : pct >= 0.5 ? '#FBBF24' : '#F87171'
              return (
                <tr key={e.id} className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-semibold text-white">{e.user?.name ?? e.user?.email ?? '—'}</td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.08)' }}>Part {e.part}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-bold" style={{ color }}>
                      {e.score}/{e.total}
                    </span>
                    <span className="text-slate-500 text-xs ml-1">({Math.round(pct * 100)}%)</span>
                  </td>
                  <td className="px-5 py-4 text-slate-400">{fmtDuration(e.duration_s)}</td>
                  <td className="px-5 py-4 text-slate-400">{new Date(e.taken_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => openDetail(e)} className="text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors">Details</button>
                  </td>
                </tr>
              )
            })}
            {displayed.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No exams yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
