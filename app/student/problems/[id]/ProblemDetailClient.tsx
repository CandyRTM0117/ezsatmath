'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, List, Check, X } from 'lucide-react'
import type { Problem, Choice } from '@/types'

const diffStyle = (d: string) => ({
  easy:   { background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' },
  medium: { background: 'rgba(245,158,11,0.12)',  color: '#FBBF24', border: '1px solid rgba(245,158,11,0.25)' },
  hard:   { background: 'rgba(239,68,68,0.12)',   color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' },
}[d] ?? {})

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={diffStyle(difficulty)}
    >
      {difficulty}
    </span>
  )
}

export default function ProblemDetailClient({ problem }: { problem: Problem & { choices: Choice[] } }) {
  const router = useRouter()

  const [selectedMC, setSelectedMC] = useState<string | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  const choices = problem.choices ?? []

  const canSubmit = problem.type === 'mc'
    ? selectedMC !== null
    : inputVal.trim() !== ''

  const isCorrect = submitted
    ? problem.type === 'mc'
      ? choices.find(c => c.is_correct)?.label === selectedMC
      : inputVal.trim().toLowerCase() === (problem.solution ?? '').trim().toLowerCase()
    : false

  function handleSubmit() {
    if (!canSubmit || submitted) return
    setSubmitted(true)
  }

  function handleTryAgain() {
    setSubmitted(false)
    setSelectedMC(null)
    setInputVal('')
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0B1224', color: '#E2E8F0' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <DifficultyBadge difficulty={problem.difficulty} />

        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-bold italic truncate text-sm">
            {problem.title ?? `P${problem.order_index}`}
          </span>
          {(problem.category || problem.topic) && (
            <span className="text-xs text-slate-400 truncate">
              {[problem.category, problem.topic].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => router.push('/student/problems')}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200"
            title="Problem list"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200"
            title="Home"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column */}
        <div
          className="flex-[3] overflow-y-auto"
          style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
        >
          {problem.image_url ? (
            <div className="relative">
              <img
                src={problem.image_url}
                alt="Problem"
                className="w-full cursor-zoom-in"
                onClick={() => setLightbox(true)}
              />
              <p className="text-center text-xs text-slate-500 py-2">click to expand</p>
            </div>
          ) : problem.question ? (
            <p className="p-6 whitespace-pre-wrap text-sm leading-relaxed">{problem.question}</p>
          ) : (
            <div
              className="m-6 rounded-xl flex items-center justify-center text-slate-500 text-sm"
              style={{ minHeight: 200, border: '2px dashed rgba(255,255,255,0.1)' }}
            >
              problem image
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex-[2] p-6 flex flex-col overflow-y-auto">
          {/* Answer section label */}
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-semibold">
            Your Answer
          </p>

          {/* MC choices */}
          {problem.type === 'mc' && (
            <div className="flex gap-3 flex-wrap mb-4">
              {choices.map((c) => {
                const isSelected = selectedMC === c.label
                const isCorrectChoice = c.is_correct
                let borderColor = 'rgba(255,255,255,0.15)'
                let textColor = '#94A3B8'
                let bg = 'rgba(255,255,255,0.03)'

                if (!submitted && isSelected) {
                  borderColor = '#3B82F6'
                  textColor = '#3B82F6'
                  bg = 'rgba(59,130,246,0.08)'
                } else if (submitted && isCorrectChoice) {
                  borderColor = '#10B981'
                  textColor = '#34D399'
                  bg = 'rgba(16,185,129,0.1)'
                } else if (submitted && isSelected && !isCorrectChoice) {
                  borderColor = '#EF4444'
                  textColor = '#F87171'
                  bg = 'rgba(239,68,68,0.1)'
                }

                return (
                  <div key={c.id} className="relative">
                    <button
                      disabled={submitted}
                      onClick={() => setSelectedMC(c.label)}
                      className="w-14 h-14 rounded-xl border-2 font-mono font-bold text-lg transition-all"
                      style={{ borderColor, color: textColor, background: bg }}
                    >
                      {c.label}
                    </button>
                    {submitted && isCorrectChoice && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check size={11} strokeWidth={3} color="white" />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Input */}
          {problem.type === 'input' && (
            <div className="mb-4">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={submitted}
                placeholder="Enter your answer"
                className="w-full px-4 py-3 rounded-xl font-mono text-base outline-none disabled:opacity-60"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px solid #3B82F6',
                  color: '#E2E8F0',
                }}
              />
              <p className="text-xs text-slate-500 mt-1.5">fraction · decimal · integer</p>
            </div>
          )}

          {/* Solution panel */}
          {submitted && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isCorrect
                    ? <Check size={16} className="text-emerald-400" />
                    : <X size={16} className="text-red-400" />
                  }
                  <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isCorrect ? 'Solution' : 'Incorrect'}
                  </span>
                </div>
                <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  step-by-step
                </button>
              </div>

              <div
                className="rounded-xl p-4 min-h-32"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {problem.explanation ? (
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {problem.explanation}
                  </p>
                ) : (
                  <div
                    className="h-24 rounded-lg flex items-center justify-center text-slate-600 text-sm"
                    style={{ border: '2px dashed rgba(255,255,255,0.08)' }}
                  >
                    solution image
                  </div>
                )}
              </div>

              {!isCorrect && problem.solution && (
                <p className="mt-2 text-sm text-emerald-400">
                  Correct answer: <span className="font-mono font-semibold">{problem.solution}</span>
                </p>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitted}
            className="w-full py-4 rounded-full font-semibold text-base transition-all"
            style={
              canSubmit && !submitted
                ? {
                    background: '#2563EB',
                    color: '#fff',
                    boxShadow: '0 0 20px rgba(37,99,235,0.4)',
                  }
                : submitted
                ? {
                    background: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: isCorrect ? '#34D399' : '#F87171',
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    color: '#475569',
                  }
            }
          >
            {!submitted ? 'Submit Answer' : isCorrect ? '✓ Correct!' : 'Try Again'}
          </button>

          {submitted && (
            <button
              onClick={handleTryAgain}
              className="w-full py-3 rounded-full text-sm font-semibold mt-3 transition-colors text-slate-400 hover:text-slate-200"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center cursor-zoom-out"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightbox(false)}
        >
          <img
            src={problem.image_url!}
            alt="Problem expanded"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
