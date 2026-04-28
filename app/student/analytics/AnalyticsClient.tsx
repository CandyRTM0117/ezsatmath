'use client'

interface Props {
  attempts: { is_correct: boolean; attempted_at: string }[]
  exams: { part: number; score: number; total: number; taken_at: string }[]
  totalAttempts: number
  correctAttempts: number
  totalExamAnswers: number
  correctExamAnswers: number
}

export default function AnalyticsClient({
  attempts,
  exams,
  totalAttempts,
  correctAttempts,
  totalExamAnswers,
  correctExamAnswers,
}: Props) {
  const problemAccuracy = totalAttempts ? Math.round(correctAttempts / totalAttempts * 100) : 0
  const examAccuracy = totalExamAnswers ? Math.round(correctExamAnswers / totalExamAnswers * 100) : 0

  // Build daily solved count for last 30 days
  const dayMap: Record<string, number> = {}
  for (const a of attempts) {
    const day = a.attempted_at.split('T')[0]
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const days: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    days.push({ date: key, count: dayMap[key] ?? 0 })
  }
  const maxCount = Math.max(...days.map(d => d.count), 1)

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Problems Solved" value={totalAttempts} />
        <Stat label="Problem Accuracy" value={`${problemAccuracy}%`} />
        <Stat label="Exams Taken" value={exams.length} />
        <Stat label="Exam Accuracy" value={`${examAccuracy}%`} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Problems Solved — Last 30 Days</h2>
        <div className="flex items-end gap-1 h-32">
          {days.map(d => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
              />
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                {d.count} · {d.date.slice(5)}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>{days[0]?.date.slice(5)}</span>
          <span>Today</span>
        </div>
      </div>

      <div>
        <ExamHistory title="Exam History" exams={exams} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  )
}

function ExamHistory({ title, exams }: { title: string; exams: { score: number; total: number; taken_at: string }[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-900 mb-4">{title}</h2>
      {exams.length === 0 ? (
        <p className="text-slate-400 text-sm">No exams taken yet</p>
      ) : (
        <div className="space-y-3">
          {exams.map((e, i) => {
            const pct = Math.round(e.score / e.total * 100)
            return (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">{new Date(e.taken_at).toLocaleDateString()}</span>
                  <span className={`font-medium ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {e.score}/{e.total} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
