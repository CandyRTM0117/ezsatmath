'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Dropdown from '@/components/ui/Dropdown'
import type { Problem, Choice, ProblemCategory } from '@/types'

type ProblemWithChoices = Problem & { choices?: Choice[] }

const CATEGORIES: ProblemCategory[] = ['Algebra', 'Trigonometry', 'Data Analytics', 'Advanced Math']

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

  const diffColor = (d: string) => ({
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  }[d] ?? '')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Problems</h1>
        <p className="text-slate-500 mt-1.5">{displayed.length} of {problems.length} shown</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search problems…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors bg-white min-h-[44px]"
        />
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
        <div className="fixed inset-0 bg-black/70 z-50 flex items-stretch p-4 lg:p-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col lg:flex-row overflow-hidden">

            {/* Left panel — question */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${diffColor(selected.difficulty)}`}>{selected.difficulty}</span>
                  {selected.category && <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">{selected.category}</span>}
                  {selected.topic && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">{selected.topic}</span>}
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-3xl leading-none ml-4 flex-shrink-0">×</button>
              </div>

              {selected.title && <h2 className="text-3xl font-bold text-slate-900 mb-5 leading-tight">{selected.title}</h2>}
              <p className="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap flex-1">{selected.question}</p>

              {result && !result.correct && selected.explanation && (
                <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-semibold text-amber-800 mb-1">Explanation</p>
                  <p className="text-sm text-amber-900 leading-relaxed">{selected.explanation}</p>
                </div>
              )}
            </div>

            {/* Right panel — answer */}
            <div className="w-full lg:w-[420px] shrink-0 overflow-y-auto p-8 lg:p-12 flex flex-col">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
                {result ? 'Result' : 'Your Answer'}
              </p>

              {result ? (
                <>
                  <div className={`rounded-2xl p-6 mb-6 flex items-center gap-4 ${result.correct ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                    <span className={`text-4xl ${result.correct ? 'text-green-500' : 'text-red-500'}`}>
                      {result.correct ? '✓' : '✗'}
                    </span>
                    <div>
                      <p className={`font-bold text-xl ${result.correct ? 'text-green-700' : 'text-red-700'}`}>
                        {result.correct ? 'Correct!' : 'Incorrect'}
                      </p>
                      {!result.correct && (
                        <p className="text-sm text-slate-600 mt-1">Correct answer: <span className="font-semibold">{selected.solution}</span></p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-full py-4 border-2 border-slate-300 text-slate-700 rounded-xl text-base font-semibold hover:bg-slate-50 transition-colors mt-auto"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  {selected.type === 'mc' ? (
                    <div className="space-y-3 flex-1">
                      {(selected.choices ?? []).sort((a, b) => a.order_index - b.order_index).map(c => (
                        <label key={c.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                          answer === c.label ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}>
                          <input type="radio" name="mc" value={c.label} checked={answer === c.label}
                            onChange={() => setAnswer(c.label)} className="accent-blue-600 mt-0.5 shrink-0" />
                          <span className="text-base font-bold text-slate-500 w-5 shrink-0">{c.label}.</span>
                          <span className="text-base text-slate-800">{c.choice_text}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      className="w-full px-4 py-4 border-2 border-slate-300 rounded-xl text-base focus:outline-none focus:border-blue-500"
                      placeholder="Type your answer…"
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submit()}
                    />
                  )}
                  <button
                    onClick={submit}
                    disabled={!answer}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl text-base transition-colors mt-6"
                  >
                    Submit Answer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {displayed.map(p => {
          const attempted = p.id in attemptMap
          const correct = attemptMap[p.id]
          return (
            <button
              key={p.id}
              onClick={() => openProblem(p)}
              className="text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md hover:border-blue-200 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${diffColor(p.difficulty)}`}>{p.difficulty}</span>
                  {p.category && <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">{p.category}</span>}
                </div>
                {attempted && (
                  <span className={`text-sm font-semibold flex-shrink-0 ${correct ? 'text-green-600' : 'text-red-500'}`}>
                    {correct ? '✓ Solved' : '✗ Tried'}
                  </span>
                )}
              </div>
              {p.title && <p className="font-semibold text-slate-900 text-base mb-2">{p.title}</p>}
              <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{p.question}</p>
              {p.topic && <p className="text-xs text-slate-400 mt-3 font-medium">{p.topic}</p>}
            </button>
          )
        })}
        {displayed.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-400 text-lg">No problems found</div>
        )}
      </div>
    </div>
  )
}
