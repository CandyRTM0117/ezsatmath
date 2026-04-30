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
    { label: 'Problems Solved',  value: totalAttempts,         from: '#60A5FA', to: '#3B82F6' },
    { label: 'Problem Accuracy', value: `${problemAccuracy}%`, from: '#34D399', to: '#10B981' },
    { label: 'Exams Taken',      value: exams.length,          from: '#A78BFA', to: '#7C3AED' },
    { label: 'Exam Accuracy',    value: `${examAccuracy}%`,    from: '#FBBF24', to: '#F59E0B' },
  ]

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Analytics
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Your performance at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {STATS.map(s => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
          >
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">{s.label}</p>
            <p
              className="text-4xl font-extrabold tracking-tight"
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

      {/* Activity */}
      <div
        className="rounded-2xl border border-white/10 p-7 mb-8"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center justify-between mb-7">
          <h2 className="font-extrabold text-white text-lg tracking-tight">Problems Solved — Last 30 Days</h2>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Daily activity</span>
        </div>
        <div className="flex items-end gap-1 h-40">
          {days.map(d => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${(d.count / maxCount) * 100}%`,
                  minHeight: d.count > 0 ? '4px' : '0',
                  background: d.count > 0
                    ? 'linear-gradient(180deg, #60A5FA, #3B82F6)'
                    : 'rgba(255,255,255,0.04)',
                  boxShadow: d.count > 0 ? '0 0 12px rgba(96,165,250,0.4)' : 'none',
                }}
              />
              {d.count > 0 && (
                <div
                  className="absolute -top-9 left-1/2 -translate-x-1/2 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity"
                  style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {d.count} · {d.date.slice(5)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs font-semibold text-slate-500 mt-3">
          <span>{days[0]?.date.slice(5)}</span>
          <span>Today</span>
        </div>
      </div>

      {/* Exam history */}
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
            {exams.map((e, i) => {
              const pct = Math.round(e.score / e.total * 100)
              const color = pct >= 80 ? '#34D399' : pct >= 50 ? '#FBBF24' : '#F87171'
              return (
                <div key={i} className="px-7 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-slate-300">
                        {new Date(e.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="font-extrabold tabular-nums" style={{ color }}>
                        {e.score}/{e.total} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}66` }} />
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
