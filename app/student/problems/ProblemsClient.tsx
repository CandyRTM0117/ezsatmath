'use client'

import { useState } from 'react'
import { Search, X, Check, CircleX, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Dropdown from '@/components/ui/Dropdown'
import type { Problem, Choice, ProblemCategory } from '@/types'

type ProblemWithChoices = Problem & { choices?: Choice[] }

const CATEGORIES: ProblemCategory[] = ['Algebra', 'Trigonometry', 'Data Analytics', 'Advanced Math']

const diffStyle = (d: string): React.CSSProperties => ({
  easy:   { background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' },
  medium: { background: 'rgba(245,158,11,0.12)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.25)' },
  hard:   { background: 'rgba(239,68,68,0.12)',  color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' },
}[d] ?? {})

export default function ProblemsClient({
  problems,
  attemptMap: initialAttemptMap,
  userId,
}: {
  problems: ProblemWithChoices[]
  attemptMap: Record<string, boolean>
  userId: string
}) {
  const [attemptMap, setAttemptMap] = useState(initialAttemptMap)
  const [selected, setSelected] = useState<ProblemWithChoices | null>(null)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<{ correct: boolean; explanation: string | null } | null>(null)
  const [filterDiff, setFilterDiff] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')

  const supabase = createClient()

  function openProblem(p: ProblemWithChoices) {
    setSelected(p)
    setAnswer('')
    setResult(null)
  }

  async function submit() {
    if (!selected || !answer) return

    const isCorrect = selected.type === 'mc'
      ? selected.choices?.find(c => c.label === answer)?.is_correct ?? false
      : answer.trim().toLowerCase() === selected.solution.trim().toLowerCase()

    await supabase.from('problem_attempts').insert({
      user_id: userId,
      problem_id: selected.id,
      is_correct: isCorrect,
    })

    setAttemptMap(m => ({ ...m, [selected.id]: isCorrect }))

    if (isCorrect) {
      setResult({ correct: true, explanation: null })
    } else {
      setResult({ correct: false, explanation: selected.explanation ?? null })
    }
  }

  const displayed = problems.filter(p => {
    if (filterDiff !== 'all' && p.difficulty !== filterDiff) return false
    if (filterCategory !== 'all' && p.category !== filterCategory) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!p.question.toLowerCase().includes(q) && !(p.title ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Problems
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          {displayed.length} of {problems.length} shown
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search problems…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-slate-200 transition-all duration-200 focus:outline-none min-h-[44px]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>
        <Dropdown
          value={filterCategory}
          onChange={setFilterCategory}
          options={[
            { value: 'all', label: 'All categories' },
            ...CATEGORIES.map(c => ({ value: c, label: c })),
          ]}
        />
        <Dropdown
          value={filterDiff}
          onChange={setFilterDiff}
          options={[
            { value: 'all', label: 'All difficulties' },
            { value: 'easy', label: 'Easy' },
            { value: 'medium', label: 'Medium' },
            { value: 'hard', label: 'Hard' },
          ]}
        />
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-stretch p-4 lg:p-8 fade-in">
          <div
            className="rounded-2xl shadow-2xl w-full flex flex-col lg:flex-row overflow-hidden zoom-in-95"
            style={{
              background: '#0F172A',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)',
            }}
          >
            {/* Left — question */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-bold capitalize" style={diffStyle(selected.difficulty)}>{selected.difficulty}</span>
                  {selected.category && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(59,130,246,0.12)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.25)' }}>
                      {selected.category}
                    </span>
                  )}
                  {selected.topic && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {selected.topic}
                    </span>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 ml-4 flex-shrink-0">
                  <X size={20} strokeWidth={1.75} />
                </button>
              </div>

              {selected.title && <h2 className="text-3xl font-extrabold text-white mb-5 leading-tight tracking-tight">{selected.title}</h2>}
              <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap flex-1">{selected.question}</p>

              {result && !result.correct && selected.explanation && (
                <div className="mt-8 p-5 rounded-2xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <p className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-2">Explanation</p>
                  <p className="text-sm text-amber-100/90 leading-relaxed">{selected.explanation}</p>
                </div>
              )}
            </div>

            {/* Right — answer */}
            <div className="w-full lg:w-[420px] shrink-0 overflow-y-auto p-8 lg:p-12 flex flex-col" style={{ background: 'rgba(255,255,255,0.015)' }}>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-5">
                {result ? 'Result' : 'Your Answer'}
              </p>

              {result ? (
                <>
                  <div
                    className="rounded-2xl p-6 mb-6 flex items-center gap-4"
                    style={result.correct
                      ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }
                      : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    {result.correct
                      ? <CheckCircle2 size={36} strokeWidth={1.75} className="text-green-400 shrink-0" />
                      : <CircleX size={36} strokeWidth={1.75} className="text-red-400 shrink-0" />}
                    <div>
                      <p className={`font-extrabold text-xl ${result.correct ? 'text-green-300' : 'text-red-300'}`}>
                        {result.correct ? 'Correct!' : 'Incorrect'}
                      </p>
                      {!result.correct && (
                        <p className="text-sm text-slate-400 mt-1">Correct answer: <span className="font-semibold text-slate-200">{selected.solution}</span></p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-full py-3.5 rounded-full text-sm font-semibold text-slate-200 transition-all duration-200 mt-auto"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  {selected.type === 'mc' ? (
                    <div className="space-y-3 flex-1">
                      {(selected.choices ?? []).sort((a, b) => a.order_index - b.order_index).map(c => {
                        const isSelected = answer === c.label
                        return (
                          <label
                            key={c.id}
                            className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200"
                            style={isSelected
                              ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.5)' }
                              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            <input type="radio" name="mc" value={c.label} checked={isSelected}
                              onChange={() => setAnswer(c.label)} className="accent-blue-500 mt-0.5 shrink-0" />
                            <span className="text-base font-bold text-slate-400 w-5 shrink-0">{c.label}.</span>
                            <span className="text-base text-slate-200">{c.choice_text}</span>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <input
                      className="w-full px-4 py-4 rounded-xl text-base text-slate-200 transition-all duration-200 focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                      placeholder="Type your answer…"
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submit()}
                    />
                  )}
                  <button
                    onClick={submit}
                    disabled={!answer}
                    className="w-full py-4 font-bold text-white rounded-full text-base transition-all duration-200 mt-6 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 10px 30px rgba(59,130,246,0.4)' }}
                  >
                    Submit Answer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {displayed.map(p => {
          const attempted = p.id in attemptMap
          const correct = attemptMap[p.id]
          return (
            <button
              key={p.id}
              onClick={() => openProblem(p)}
              className="text-left rounded-2xl p-6 border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/30"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                boxShadow: '0 12px 30px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.02) inset',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3), 0 0 30px rgba(59,130,246,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.02) inset')}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize" style={diffStyle(p.difficulty)}>{p.difficulty}</span>
                  {p.category && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(59,130,246,0.1)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {p.category}
                    </span>
                  )}
                </div>
                {attempted && (
                  <span className={`text-xs font-bold flex-shrink-0 inline-flex items-center gap-1 ${correct ? 'text-green-400' : 'text-red-400'}`}>
                    {correct ? <Check size={12} strokeWidth={2.5} /> : <X size={12} strokeWidth={2.5} />}
                    {correct ? 'Solved' : 'Tried'}
                  </span>
                )}
              </div>
              {p.title && <p className="font-extrabold text-white text-base mb-2">{p.title}</p>}
              <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{p.question}</p>
              {p.topic && <p className="text-xs text-slate-500 mt-3 font-semibold">{p.topic}</p>}
            </button>
          )
        })}
        {displayed.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-500 text-base">No problems found</div>
        )}
      </div>
    </div>
  )
}
