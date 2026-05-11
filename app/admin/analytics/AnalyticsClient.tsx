'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Mail, Calendar, TrendingUp } from 'lucide-react'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function intensity(count: number, max: number): string {
  if (count === 0 || max === 0) return 'rgba(255,255,255,0.04)'
  const ratio = count / max
  if (ratio < 0.2) return 'rgba(139,92,246,0.20)'
  if (ratio < 0.4) return 'rgba(139,92,246,0.38)'
  if (ratio < 0.6) return 'rgba(139,92,246,0.55)'
  if (ratio < 0.8) return 'rgba(139,92,246,0.72)'
  return 'rgba(139,92,246,0.92)'
}

function glowFor(count: number, max: number): string {
  if (count === 0 || max === 0) return 'none'
  const ratio = count / max
  if (ratio < 0.4) return 'none'
  if (ratio < 0.7) return '0 0 8px rgba(139,92,246,0.4)'
  return '0 0 14px rgba(139,92,246,0.7)'
}

export default function AnalyticsClient() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-based
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [total, setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true)
    const res = await fetch(`/api/admin/email-logs?year=${y}&month=${m}`)
    if (res.ok) {
      const json = await res.json()
      setCounts(json.counts ?? {})
      setTotal(json.total ?? 0)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(year, month) }, [year, month, load])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const n = new Date()
    if (year > n.getFullYear() || (year === n.getFullYear() && month >= n.getMonth() + 1)) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  // Build calendar grid
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow    = new Date(year, month - 1, 1).getDay() // 0=Sun

  const allValues  = Object.values(counts)
  const maxCount   = allValues.length ? Math.max(...allValues) : 0
  const activeDays = allValues.filter(v => v > 0).length
  const avgPerDay  = activeDays > 0 ? (total / activeDays).toFixed(1) : '0'
  const mostActiveDay = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // Pad to start on correct weekday
  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayStr = now.toISOString().slice(0, 10)

  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent mb-8">
        Analytics
      </h1>

      <section className="mb-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Mail size={18} className="text-violet-400" /> Email Activity
        </h2>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            {
              icon: <Mail size={16} />,
              label: 'Total this month',
              value: total,
            },
            {
              icon: <Calendar size={16} />,
              label: 'Most active day',
              value: mostActiveDay
                ? new Date(mostActiveDay + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—',
            },
            {
              icon: <TrendingUp size={16} />,
              label: 'Avg per active day',
              value: avgPerDay,
            },
          ].map(({ icon, label, value }) => (
            <div
              key={label}
              className="rounded-2xl p-4 flex flex-col gap-1"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
              <div className="flex items-center gap-1.5 text-violet-400 text-xs font-semibold uppercase tracking-wider">
                {icon} {label}
              </div>
              <div className="text-2xl font-extrabold text-white">{loading ? '…' : value}</div>
            </div>
          ))}
        </div>

        {/* Month navigator + heatmap */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-all text-slate-400 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-white text-base">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-all text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />

              const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const count   = counts[dateStr] ?? 0
              const isToday = dateStr === todayStr
              const bg      = intensity(count, maxCount)
              const glow    = glowFor(count, maxCount)

              return (
                <div
                  key={dateStr}
                  title={count > 0 ? `${count} email${count !== 1 ? 's' : ''} on ${dateStr}` : dateStr}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center transition-all duration-200 hover:scale-110 cursor-default select-none"
                  style={{
                    background: bg,
                    boxShadow: isToday
                      ? '0 0 0 2px rgba(34,211,238,0.7)' + (glow !== 'none' ? `, ${glow}` : '')
                      : glow,
                  }}
                >
                  <span className="text-xs font-semibold" style={{ color: count > 0 ? '#fff' : 'var(--text-3)' }}>
                    {day}
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 justify-end">
            <span className="text-xs text-slate-500">Less</span>
            {[0, 0.2, 0.5, 0.8, 1].map(r => (
              <div
                key={r}
                className="w-4 h-4 rounded"
                style={{ background: r === 0 ? 'rgba(255,255,255,0.04)' : `rgba(139,92,246,${0.2 + r * 0.72})` }}
              />
            ))}
            <span className="text-xs text-slate-500">More</span>
          </div>
        </div>
      </section>
    </div>
  )
}
