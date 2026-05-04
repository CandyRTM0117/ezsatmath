'use client'

import { useState, useRef, Component, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Check, CircleX, CheckCircle2, BookmarkX, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Dropdown from '@/components/ui/Dropdown'
import type { Problem, Choice, ProblemCategory } from '@/types'

type ProblemWithChoices = Problem & { choices?: Choice[] }

const CATEGORIES: ProblemCategory[] = ['Algebra', 'Trigonometry', 'Data Analytics', 'Advanced Math']
const PAGE_SIZE = 50

const diffStyle = (d: string): React.CSSProperties => ({
  easy:   { background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' },
  medium: { background: 'rgba(245,158,11,0.12)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.25)' },
  hard:   { background: 'rgba(239,68,68,0.12)',  color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' },
}[d] ?? {})

class ProblemErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center text-slate-400 text-sm">
          <p className="font-semibold mb-2">Problem failed to load</p>
          <button onClick={() => this.setState({ hasError: false })} className="text-blue-400 hover:text-blue-300 text-xs font-semibold">Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function BookmarksClient({
  problems: initialProblems,
  attemptMap: initialAttemptMap,
  userId,
}: {
  problems: ProblemWithChoices[]
  attemptMap: Record<string, boolean>
  userId: string
}) {
  const [problems, setProblems] = useState(initialProblems)
  const [attemptMap, setAttemptMap] = useState(initialAttemptMap)
  const [selected, setSelected] = useState<ProblemWithChoices | null>(null)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<{ correct: boolean; explanation: string | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [imgLoading, setImgLoading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [filterDiff, setFilterDiff] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const supabase = useRef(createClient()).current

  function openProblem(p: ProblemWithChoices) {
    setSelected(p)
    setAnswer('')
    setResult(null)
    setImgError(false)
    setImgLoading(!!p.image_url)
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
  }

  function closeProblem() {
    setSelected(null)
    setLightbox(false)
    document.body.style.overflow = ''
    document.body.classList.remove('modal-open')
  }

  async function submit() {
    if (!selected || !answer || submitting) return
    setSubmitting(true)
    try {
      const isCorrect = selected.type === 'mc'
        ? selected.choices?.find(c => c.label === answer)?.is_correct ?? false
        : answer.trim().toLowerCase() === selected.solution.trim().toLowerCase()
      await supabase.from('problem_attempts').insert({ user_id: userId, problem_id: selected.id, is_correct: isCorrect })
      setAttemptMap(m => ({ ...m, [selected.id]: isCorrect }))
      setResult({ correct: isCorrect, explanation: selected.explanation ?? null })
    } finally {
      setSubmitting(false)
    }
  }

  async function removeBookmark(problemId: string, closeModal = false) {
    setRemoving(problemId)
    try {
      await supabase.from('bookmarks').delete().eq('user_id', userId).eq('problem_id', problemId)
      setProblems(prev => prev.filter(p => p.id !== problemId))
      if (closeModal) closeProblem()
    } finally {
      setRemoving(null)
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

  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = displayed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => { setter(v); setPage(1) }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Bookmarks
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          {displayed.length} of {problems.length} saved problem{problems.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search bookmarks…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none min-h-[44px]"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-color)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
          />
        </div>
        <Dropdown
          value={filterCategory}
          onChange={handleFilterChange(setFilterCategory)}
          options={[
            { value: 'all', label: 'All categories' },
            ...CATEGORIES.map(c => ({ value: c, label: c })),
          ]}
        />
        <Dropdown
          value={filterDiff}
          onChange={handleFilterChange(setFilterDiff)}
          options={[
            { value: 'all', label: 'All difficulties' },
            { value: 'easy', label: 'Easy' },
            { value: 'medium', label: 'Medium' },
            { value: 'hard', label: 'Hard' },
          ]}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 mb-6 flex-wrap">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            style={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
              style={n === safePage
                ? { background: '#3B82F6', color: 'white', border: '1px solid #3B82F6' }
                : { background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            style={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
          >
            <ChevronRight size={15} strokeWidth={2} />
          </button>
          <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>Page {safePage} of {totalPages}</span>
        </div>
      )}

      {selected && createPortal(
        <>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center md:bg-black/80 md:backdrop-blur-sm md:p-6"
            onClick={closeProblem}
          >
            <ProblemErrorBoundary>
              <div
                className="flex flex-col overflow-hidden w-full h-full rounded-none md:rounded-2xl md:w-[92vw] md:max-w-[1200px] md:h-[88vh]"
                onClick={e => e.stopPropagation()}
                style={{
                  background: 'var(--app-bg-alt)',
                  border: '1px solid var(--card-border)',
                  boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
                }}
              >
                {/* Mobile header */}
                <div
                  className="flex md:hidden items-center gap-3 px-4 py-3 flex-shrink-0"
                  style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--app-bg-alt)' }}
                >
                  <button
                    onClick={closeProblem}
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={20} />
                    Back
                  </button>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize ml-1" style={diffStyle(selected.difficulty)}>
                    {selected.difficulty}
                  </span>
                  <span className="text-xs truncate flex-1 min-w-0" style={{ color: 'var(--text-muted)' }}>
                    {[selected.category, selected.topic].filter(Boolean).join(' · ')}
                  </span>
                  <button
                    onClick={() => removeBookmark(selected.id, true)}
                    disabled={removing === selected.id}
                    className="p-1.5 rounded-lg text-yellow-400 hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
                    title="Remove bookmark"
                  >
                    {removing === selected.id ? <Loader2 size={16} className="animate-spin" /> : <BookmarkX size={16} />}
                  </button>
                </div>

                {/* Desktop header */}
                <div
                  className="hidden md:flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
                  style={{ borderBottom: '1px solid var(--card-border)' }}
                >
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold capitalize shrink-0" style={diffStyle(selected.difficulty)}>
                    {selected.difficulty}
                  </span>
                  <span className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {selected.title ?? `P${selected.order_index}`}
                  </span>
                  {selected.category && <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{selected.category}</span>}
                  {selected.topic && <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{selected.topic}</span>}
                  <div className="flex items-center gap-1 ml-auto shrink-0">
                    <button
                      onClick={() => removeBookmark(selected.id, true)}
                      disabled={removing === selected.id}
                      className="p-1.5 rounded-lg text-yellow-400 hover:text-red-400 hover:bg-white/5 transition-colors disabled:opacity-50"
                      title="Remove bookmark"
                    >
                      {removing === selected.id ? <Loader2 size={16} className="animate-spin" /> : <BookmarkX size={16} />}
                    </button>
                    <button onClick={closeProblem} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0 relative">
                  {imgLoading && (
                    <div
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
                      style={{ background: 'var(--app-bg-alt)' }}
                    >
                      <div className="w-64 flex flex-col gap-3">
                        {[100, 80, 90, 70].map((w, i) => (
                          <div key={i} className="h-3 rounded-full animate-pulse" style={{ background: 'var(--card-border)', width: `${w}%` }} />
                        ))}
                      </div>
                      <Loader2 size={20} className="animate-spin text-slate-600 mt-2" />
                    </div>
                  )}

                  {/* Left */}
                  <div className="h-[52%] overflow-y-auto md:h-full md:w-[62%] md:flex-none border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--card-border)' }}>
                    {selected.image_url && !imgError ? (
                      <div className="h-full flex flex-col">
                        <img
                          key={selected.id}
                          src={selected.image_url}
                          alt="Problem"
                          className="flex-1 w-full object-contain cursor-zoom-in min-h-0"
                          onClick={() => setLightbox(true)}
                          onLoad={() => setImgLoading(false)}
                          onError={() => { setImgError(true); setImgLoading(false) }}
                        />
                        {!imgLoading && <p className="text-center text-xs text-slate-600 py-1.5 flex-shrink-0">click to expand</p>}
                      </div>
                    ) : selected.question ? (
                      <p className="p-6 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{selected.question}</p>
                    ) : (
                      <div
                        className="m-6 rounded-xl flex items-center justify-center text-sm"
                        style={{ minHeight: 180, border: '2px dashed var(--card-border)', color: 'var(--text-muted)' }}
                      >
                        problem image
                      </div>
                    )}
                  </div>

                  {/* Right */}
                  <div className="flex-1 min-h-0 overflow-y-auto md:flex-none md:h-full md:w-[38%] p-5 md:p-6 flex flex-col">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                      {result ? 'Result' : 'Your Answer'}
                    </p>

                    {selected.type === 'mc' && !result && (
                      <div className="flex gap-3 flex-wrap mb-4">
                        {(selected.choices ?? []).sort((a, b) => a.order_index - b.order_index).map(c => {
                          const isSelected = answer === c.label
                          return (
                            <button
                              key={c.id}
                              onClick={() => setAnswer(c.label)}
                              className="w-14 h-14 rounded-xl border-2 font-mono font-bold text-lg transition-all"
                              style={isSelected
                                ? { borderColor: '#3B82F6', color: '#3B82F6', background: 'rgba(59,130,246,0.08)' }
                                : { borderColor: 'var(--card-border)', color: 'var(--text-muted)', background: 'var(--input-bg)' }}
                            >
                              {c.label}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {selected.type === 'input' && !result && (
                      <div className="mb-4">
                        <input
                          type="text"
                          value={answer}
                          onChange={e => setAnswer(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && submit()}
                          placeholder="Enter your answer"
                          className="w-full px-4 py-3 rounded-xl font-mono text-base outline-none"
                          style={{ background: 'var(--input-bg)', border: '2px solid #3B82F6', color: 'var(--text-primary)' }}
                        />
                        <p className="text-xs text-slate-500 mt-1.5">fraction · decimal · integer</p>
                      </div>
                    )}

                    {result && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          {result.correct
                            ? <CheckCircle2 size={16} className="text-emerald-400" />
                            : <CircleX size={16} className="text-red-400" />}
                          <span className={`text-sm font-semibold ${result.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                            {result.correct ? 'Correct!' : 'Incorrect'}
                          </span>
                        </div>
                        <div className="rounded-xl p-4 min-h-24" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                          {result.explanation ? (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>{result.explanation}</p>
                          ) : (
                            <div className="h-16 rounded-lg flex items-center justify-center text-sm" style={{ border: '2px dashed var(--card-border)', color: 'var(--text-muted)' }}>
                              no explanation
                            </div>
                          )}
                        </div>
                        {!result.correct && selected.solution && (
                          <p className="mt-2 text-sm text-emerald-400">
                            Correct answer: <span className="font-mono font-semibold">{selected.solution}</span>
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex-1" />

                    {!result ? (
                      <button
                        onClick={submit}
                        disabled={!answer || submitting}
                        className="w-full py-4 rounded-full font-semibold text-base transition-all"
                        style={answer && !submitting
                          ? { background: '#2563EB', color: '#fff', boxShadow: '0 0 20px rgba(37,99,235,0.4)' }
                          : { background: 'var(--input-bg)', color: '#475569' }}
                      >
                        {submitting
                          ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Submitting…</span>
                          : 'Submit Answer'}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setResult(null); setAnswer('') }}
                        className="w-full py-4 rounded-full font-semibold text-sm transition-colors"
                        style={{ border: '1px solid var(--input-border)', color: 'var(--text-muted)' }}
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </ProblemErrorBoundary>
          </div>

          {lightbox && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center cursor-zoom-out"
              style={{ background: 'rgba(0,0,0,0.92)' }}
              onClick={() => setLightbox(false)}
            >
              <img
                src={selected.image_url!}
                alt="Problem expanded"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
        </>,
        document.body
      )}

      {problems.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ border: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-slate-400 text-base mb-2">No bookmarks yet</p>
          <p className="text-slate-500 text-sm">Click the bookmark icon on any problem to save it here.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
          <div
            className="hidden md:grid items-center px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest select-none"
            style={{
              gridTemplateColumns: '2.5rem 5.5rem 1fr 13rem 5rem',
              gap: '0.75rem',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--card-border)',
              background: 'var(--table-header-bg)',
            }}
          >
            <span className="text-right">#</span>
            <span>Difficulty</span>
            <span>Question</span>
            <span>Domain · Topic</span>
            <span className="text-right">Status</span>
          </div>

          {paginated.map((p, i) => {
            const attempted = p.id in attemptMap
            const correct = attemptMap[p.id]
            const rowNum = (safePage - 1) * PAGE_SIZE + i + 1
            return (
              <div
                key={p.id}
                onClick={() => openProblem(p)}
                className="flex md:grid items-center px-5 py-3.5 cursor-pointer transition-colors gap-3"
                style={{
                  gridTemplateColumns: '2.5rem 5.5rem 1fr 13rem 5rem',
                  borderBottom: '1px solid var(--card-border)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--table-row-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <span className="hidden md:block text-right text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {rowNum}
                </span>
                <div className="flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={diffStyle(p.difficulty)}>
                    {p.difficulty}
                  </span>
                </div>
                <p className="flex-1 min-w-0 text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {p.title || p.question || '—'}
                </p>
                <p className="hidden md:block text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {[p.category, p.topic].filter(Boolean).join(' · ') || '—'}
                </p>
                <div className="flex items-center justify-end gap-2 flex-shrink-0">
                  {attempted && (
                    correct
                      ? <Check size={13} strokeWidth={2.5} className="text-emerald-500 flex-shrink-0" />
                      : <X size={13} strokeWidth={2.5} className="text-red-400 flex-shrink-0" />
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); removeBookmark(p.id) }}
                    disabled={removing === p.id}
                    className="p-1 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Remove bookmark"
                  >
                    {removing === p.id
                      ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                      : <BookmarkX size={14} className="text-yellow-400 hover:text-red-400" />}
                  </button>
                </div>
              </div>
            )
          })}

          {paginated.length === 0 && (
            <div className="py-20 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No bookmarks found
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
          >
            <ChevronLeft size={14} strokeWidth={2} /> Prev
          </button>
          <span className="text-sm px-2" style={{ color: 'var(--text-muted)' }}>Page {safePage} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
          >
            Next <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}
