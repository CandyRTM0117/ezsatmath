'use client'

import { useState, useRef, Component, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Check, CircleX, CheckCircle2, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Loader2, Menu } from 'lucide-react'
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

export default function ProblemsClient({
  problems,
  attemptMap: initialAttemptMap,
  userId,
  initialBookmarks,
}: {
  problems: ProblemWithChoices[]
  attemptMap: Record<string, boolean>
  userId: string
  initialBookmarks: Set<string>
}) {
  const [attemptMap, setAttemptMap] = useState(initialAttemptMap)
  const [bookmarks, setBookmarks] = useState<Set<string>>(initialBookmarks)
  const [bookmarkLoading, setBookmarkLoading] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<ProblemWithChoices | null>(null)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<{ correct: boolean; explanation: string | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [imgLoading, setImgLoading] = useState(false)
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
      await supabase.from('problem_attempts').insert({
        user_id: userId,
        problem_id: selected.id,
        is_correct: isCorrect,
      })
      setAttemptMap(m => ({ ...m, [selected.id]: isCorrect }))
      setResult({ correct: isCorrect, explanation: selected.explanation ?? null })
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleBookmark(e: React.MouseEvent, problemId: string) {
    e.stopPropagation()
    if (bookmarkLoading.has(problemId)) return
    setBookmarkLoading(prev => new Set(prev).add(problemId))
    try {
      const { data: existing } = await supabase
        .from('bookmarks').select('id')
        .eq('user_id', userId).eq('problem_id', problemId).maybeSingle()
      if (existing) {
        await supabase.from('bookmarks').delete().eq('id', existing.id)
        setBookmarks(prev => { const n = new Set(prev); n.delete(problemId); return n })
      } else {
        await supabase.from('bookmarks').insert({ user_id: userId, problem_id: problemId })
        setBookmarks(prev => new Set(prev).add(problemId))
      }
    } finally {
      setBookmarkLoading(prev => { const n = new Set(prev); n.delete(problemId); return n })
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
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-slate-200 transition-all duration-200 focus:outline-none min-h-[44px]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
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

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
              style={n === safePage
                ? { background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: 'white' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
          <span className="text-xs text-slate-500 ml-1">Page {safePage} of {totalPages}</span>
        </div>
      )}

      {/* Problem modal */}
      {selected && createPortal(
        <>
          {/* Backdrop — no padding on mobile (full screen), padded on desktop */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center md:bg-black/80 md:backdrop-blur-sm md:p-6"
            onClick={closeProblem}
          >
            <ProblemErrorBoundary>
              <div
                className="
                  flex flex-col overflow-hidden
                  w-full h-full rounded-none
                  md:rounded-2xl md:w-[92vw] md:max-w-[1200px] md:h-[88vh]
                "
                onClick={e => e.stopPropagation()}
                style={{
                  background: '#0F172A',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
                }}
              >
                {/* Mobile header — back button */}
                <div
                  className="flex md:hidden items-center gap-3 px-4 py-3 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0F172A' }}
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
                  <span className="text-xs text-slate-400 truncate flex-1 min-w-0">
                    {[selected.category, selected.topic].filter(Boolean).join(' · ')}
                  </span>
                  <button
                    onClick={e => toggleBookmark(e, selected.id)}
                    disabled={bookmarkLoading.has(selected.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {bookmarkLoading.has(selected.id)
                      ? <Loader2 size={16} className="animate-spin" />
                      : bookmarks.has(selected.id)
                        ? <BookmarkCheck size={16} className="text-yellow-400" />
                        : <Bookmark size={16} />}
                  </button>
                </div>

                {/* Desktop header */}
                <div
                  className="hidden md:flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold capitalize shrink-0" style={diffStyle(selected.difficulty)}>
                    {selected.difficulty}
                  </span>
                  <span className="font-bold text-white text-sm truncate">
                    {selected.title ?? `P${selected.order_index}`}
                  </span>
                  {selected.category && (
                    <span className="text-xs text-slate-400 shrink-0">{selected.category}</span>
                  )}
                  {selected.topic && (
                    <span className="text-xs text-slate-500 truncate">{selected.topic}</span>
                  )}
                  <div className="flex items-center gap-1 ml-auto shrink-0">
                    <button
                      onClick={e => toggleBookmark(e, selected.id)}
                      disabled={bookmarkLoading.has(selected.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                      {bookmarkLoading.has(selected.id)
                        ? <Loader2 size={16} className="animate-spin" />
                        : bookmarks.has(selected.id)
                          ? <BookmarkCheck size={16} className="text-yellow-400" />
                          : <Bookmark size={16} />}
                    </button>
                    <button onClick={closeProblem} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Body — vertical on mobile, horizontal on desktop */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0 relative">

                  {/* Loading overlay */}
                  {imgLoading && (
                    <div
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
                      style={{ background: '#0F172A' }}
                    >
                      <div className="w-64 flex flex-col gap-3">
                        <div className="h-3 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.08)', width: '100%' }} />
                        <div className="h-3 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: '80%' }} />
                        <div className="h-3 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: '90%' }} />
                        <div className="h-3 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', width: '70%' }} />
                      </div>
                      <Loader2 size={20} className="animate-spin text-slate-600 mt-2" />
                    </div>
                  )}

                  {/* Left — Mobile: 52% height. Desktop: 62% width */}
                  <div
                    className="h-[52%] overflow-y-auto md:h-full md:w-[62%] md:flex-none border-b border-white/[0.08] md:border-b-0 md:border-r md:border-white/[0.08]"
                  >
                    {selected.image_url && !imgError ? (
                      <div className="h-full flex flex-col">
                        <img
                          src={selected.image_url}
                          alt="Problem"
                          className="flex-1 w-full object-contain cursor-zoom-in min-h-0"
                          onClick={() => setLightbox(true)}
                          onLoad={() => setImgLoading(false)}
                          onError={() => { setImgError(true); setImgLoading(false) }}
                        />
                        {!imgLoading && (
                          <p className="text-center text-xs text-slate-600 py-1.5 flex-shrink-0">click to expand</p>
                        )}
                      </div>
                    ) : selected.question ? (
                      <p className="p-6 whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">{selected.question}</p>
                    ) : (
                      <div
                        className="m-6 rounded-xl flex items-center justify-center text-slate-600 text-sm"
                        style={{ minHeight: 180, border: '2px dashed rgba(255,255,255,0.08)' }}
                      >
                        problem image
                      </div>
                    )}
                  </div>

                  {/* Right — Mobile: remaining height. Desktop: 38% width */}
                  <div
                    className="flex-1 min-h-0 overflow-y-auto md:flex-none md:h-full md:w-[38%] p-5 md:p-6 flex flex-col"
                  >
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                      Your Answer
                    </p>

                    {/* MC buttons */}
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
                                : { borderColor: 'rgba(255,255,255,0.15)', color: '#94A3B8', background: 'rgba(255,255,255,0.03)' }}
                            >
                              {c.label}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Input */}
                    {selected.type === 'input' && !result && (
                      <div className="mb-4">
                        <input
                          type="text"
                          value={answer}
                          onChange={e => setAnswer(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && submit()}
                          placeholder="Enter your answer"
                          className="w-full px-4 py-3 rounded-xl font-mono text-base outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid #3B82F6', color: '#E2E8F0' }}
                        />
                        <p className="text-xs text-slate-500 mt-1.5">fraction · decimal · integer</p>
                      </div>
                    )}

                    {/* Result panel */}
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
                        <div
                          className="rounded-xl p-4 min-h-24"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {result.explanation ? (
                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{result.explanation}</p>
                          ) : (
                            <div className="h-16 rounded-lg flex items-center justify-center text-slate-600 text-sm"
                              style={{ border: '2px dashed rgba(255,255,255,0.08)' }}>
                              solution image
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

                    {/* Submit / Try Again */}
                    {!result ? (
                      <button
                        onClick={submit}
                        disabled={!answer || submitting}
                        className="w-full py-4 rounded-full font-semibold text-base transition-all"
                        style={answer && !submitting
                          ? { background: '#2563EB', color: '#fff', boxShadow: '0 0 20px rgba(37,99,235,0.4)' }
                          : { background: 'rgba(255,255,255,0.04)', color: '#475569' }}
                      >
                        {submitting
                          ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Submitting…</span>
                          : 'Submit Answer'}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setResult(null); setAnswer('') }}
                        className="w-full py-4 rounded-full font-semibold text-sm text-slate-300 transition-colors"
                        style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </ProblemErrorBoundary>
          </div>

          {/* Lightbox */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginated.map(p => {
          const attempted = p.id in attemptMap
          const correct = attemptMap[p.id]
          const isBookmarked = bookmarks.has(p.id)
          return (
            <div
              key={p.id}
              onClick={() => openProblem(p)}
              className="cursor-pointer text-left rounded-2xl p-6 border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/30 relative"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                boxShadow: '0 12px 30px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.02) inset',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3), 0 0 30px rgba(59,130,246,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.02) inset')}
            >
              <button
                onClick={e => toggleBookmark(e, p.id)}
                disabled={bookmarkLoading.has(p.id)}
                className="absolute top-4 right-4 text-slate-500 hover:text-yellow-400 transition-colors z-10 disabled:opacity-50"
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                {bookmarkLoading.has(p.id)
                  ? <Loader2 size={16} strokeWidth={1.75} className="animate-spin text-slate-400" />
                  : isBookmarked
                    ? <BookmarkCheck size={16} strokeWidth={1.75} className="text-yellow-400" />
                    : <Bookmark size={16} strokeWidth={1.75} />}
              </button>

              <div className="flex items-start justify-between mb-3 pr-6">
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
            </div>
          )
        })}
        {paginated.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-500 text-base">No problems found</div>
        )}
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft size={14} strokeWidth={2} /> Prev
          </button>
          <span className="text-sm text-slate-500">Page {safePage} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Next <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}
