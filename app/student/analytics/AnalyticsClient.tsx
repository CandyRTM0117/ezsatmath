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
  attempts, exams, totalAttempts, correctAttempts, totalExamAnswers, correctExamAnswers,
}: Props) {
  const problemAccuracy = totalAttempts ? Math.round(correctAttempts / totalAttempts * 100) : 0
  const examAccuracy    = totalExamAnswers ? Math.round(correctExamAnswers / totalExamAnswers * 100) : 0

  const dayMap: Record<string, number> = {}
  for (const a of attempts) {
    const day = a.attempted_at.split('T')[0]
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const days: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    days.push({ date: key, count: dayMap[key] ?? 0 })
  }
  const maxCount = Math.max(...days.map(d => d.count), 1)

  const STATS = [
    { label: 'Problems Solved',    value: totalAttempts,    from: '#3B82F6', to: '#1D4ED8' },
    { label: 'Problem Accuracy',   value: `${problemAccuracy}%`, from: '#10B981', to: '#059669' },
    { label: 'Exams Taken',        value: exams.length,     from: '#8B5CF6', to: '#6D28D9' },
    { label: 'Exam Accuracy',      value: `${examAccuracy}%`,    from: '#F59E0B', to: '#D97706' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics</h1>
        <p className="text-slate-500 mt-1.5">Your performance at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {STATS.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-1 transition-transform duration-200">
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${s.from}, ${s.to})` }} />
            <div className="p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{s.label}</p>
              <p className="text-4xl font-extrabold tracking-tight" style={{ color: s.from }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Activity chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-extrabold text-slate-900 text-lg">Problems Solved — Last 30 Days</h2>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily activity</span>
        </div>
        <div className="flex items-end gap-1 h-36">
          {days.map(d => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${(d.count / maxCount) * 100}%`,
                  minHeight: d.count > 0 ? '4px' : '0',
                  background: d.count > 0 ? 'linear-gradient(180deg, #3B82F6, #1D4ED8)' : '#F1F5F9',
                }}
              />
              {d.count > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                  {d.count} · {d.date.slice(5)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs font-medium text-slate-400 mt-3">
          <span>{days[0]?.date.slice(5)}</span>
          <span>Today</span>
        </div>
      </div>

      {/* Exam history */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-extrabold text-slate-900 text-lg">Exam History</h2>
        </div>
        {exams.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">No exams taken yet</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {exams.map((e, i) => {
              const pct = Math.round(e.score / e.total * 100)
              const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
              return (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-slate-600">{new Date(e.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="font-extrabold" style={{ color }}>{e.score}/{e.total} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
