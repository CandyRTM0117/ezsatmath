'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  const [answers, setAnswers] = useState<ExamAnswer[]>([])
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  const [filterUser, setFilterUser] = useState('all')

  const supabase = createClient()

  async function openDetail(exam: ExamRow) {
    setSelectedExam(exam)
    setLoadingAnswers(true)
    const { data } = await supabase
      .from('exam_answers')
      .select('*, problem:problems(question, solution)')
      .eq('exam_id', exam.id)
    setAnswers((data ?? []) as ExamAnswer[])
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Exam Tracker</h1>
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="all">All students</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
          ))}
        </select>
      </div>

      {selectedExam && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 mx-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedExam.user?.name ?? selectedExam.user?.email} — Part {selectedExam.part}
                </h2>
                <p className="text-sm text-slate-500">
                  Score: {selectedExam.score}/{selectedExam.total} · {fmtDuration(selectedExam.duration_s)} · {new Date(selectedExam.taken_at).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedExam(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            {loadingAnswers ? (
              <p className="text-slate-400 text-sm">Loading…</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {answers.map((a, i) => (
                  <div key={a.id} className={`p-3 rounded-lg border ${a.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <p className="text-sm font-medium text-slate-800">Q{i + 1}: {(a.problem as any)?.question}</p>
                    <p className="text-xs text-slate-600 mt-1">Answer: <span className={a.is_correct ? 'text-green-700' : 'text-red-700'}>{a.user_answer}</span></p>
                    {!a.is_correct && <p className="text-xs text-slate-500">Correct: {(a.problem as any)?.solution}</p>}
                  </div>
                ))}
                {answers.length === 0 && <p className="text-slate-400 text-sm">No answers recorded.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Student</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Part</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Score</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Duration</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(e => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{e.user?.name ?? e.user?.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">Part {e.part}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${e.score / e.total >= 0.8 ? 'text-green-600' : e.score / e.total >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {e.score}/{e.total}
                  </span>
                  <span className="text-slate-400 text-xs ml-1">({Math.round(e.score / e.total * 100)}%)</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{fmtDuration(e.duration_s)}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(e.taken_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => openDetail(e)} className="text-blue-600 hover:underline text-xs">Details</button>
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No exams yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
