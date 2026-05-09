'use client'

import { useState, useRef, useMemo, useEffect, Component, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Check, CircleX, CheckCircle2, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Loader2, Menu, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Dropdown from '@/components/ui/Dropdown'
import type { Problem, Choice } from '@/types'

type ProblemWithChoices = Problem & { choices?: Choice[] }

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

// Hook to detect desktop vs mobile (for inline-style layout)
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isDesktop
}

export default function ProblemsClient({
  problems,
  attemptMap: initialAttemptMap,
  userId,
  initialBookmarks,
  userData,
  isSubscribed,
}: {
  problems: ProblemWithChoices[]
  attemptMap: Record<string, boolean>
  userId: string
  initialBookmarks: Set<string>
  userData?: Record<string, unknown>
  isSubscribed?: boolean
}) {
  const preferredLanguage = (userData?.preferred_language as 'en' | 'mn') ?? 'en'
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

  const isDesktop = useIsDesktop()

  // Derive categories from actual data so the filter always matches DB values exactly
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    for (const p of problems) { if (p.category) cats.add(p.category) }
    return Array.from(cats).sort()
  }, [problems])

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
      const isCorrect = selected.type === 'mc' && (selected.choices?.length ?? 0) > 0
        ? selected.choices?.find(c => c.label === answer)?.is_correct ?? false
        : answer.trim().toUpperCase() === selected.solution.trim().toUpperCase()
      await supabase.from('problem_attempts').insert({
        user_id: userId,
        problem_id: selected.id,
        is_correct: isCorrect,
      })
      setAttemptMap(m => ({ ...m, [selected.id]: isCorrect }))
      const explanation = preferredLanguage === 'mn'
        ? (selected.explanation_mn || selected.explanation)
        : selected.explanation
      setResult({ correct: isCorrect, explanation: explanation ?? null })
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
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>
          Problems
        </h1>
        <p className="mt-2 text-lg" style={{ color: 'var(--text-2)' }}>
          {displayed.length} of {problems.length} shown
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div className="relative" style={{ flex: 1 }}>
          <Search size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search problems…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none min-h-[44px]"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-1)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
          />
        </div>
        <Dropdown
          value={filterCategory}
          onChange={handleFilterChange(setFilterCategory)}
          options={[
            { value: 'all', label: 'All categories' },
            ...availableCategories.map(c => ({ value: c, label: c })),
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', opacity: safePage === 1 ? 0.3 : 1, transition: 'all 0.15s' }}
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              style={n === safePage
                ? { width: '2rem', height: '2rem', borderRadius: '6px', border: '1px solid #3B82F6', background: '#3B82F6', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }
                : { width: '2rem', height: '2rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--surface)', color: 'var(--text-2)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', opacity: safePage === totalPages ? 0.3 : 1, transition: 'all 0.15s' }}
          >
            <ChevronRight size={15} strokeWidth={2} />
          </button>
          <span style={{ fontSize: '0.75rem', marginLeft: '4px', color: 'var(--text-3)' }}>Page {safePage} of {totalPages}</span>
        </div>
      )}

      {/* Problem modal — uses inline styles instead of Tailwind responsive classes for layout reliability */}
      {selected && createPortal(
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              padding: isDesktop ? '1.5rem' : 0,
            }}
            onClick={closeProblem}
          >
            <ProblemErrorBoundary>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  width: isDesktop ? 'min(92vw, 1200px)' : '100%',
                  height: isDesktop ? '88vh' : '100%',
                  borderRadius: isDesktop ? '1rem' : 0,
                  background: 'var(--app-bg, #0a0f1f)',
                  border: '1px solid var(--card-border, #1e293b)',
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Mobile header */}
                {!isDesktop && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      flexShrink: 0,
                      borderBottom: '1px solid var(--card-border, #1e293b)',
                      background: 'var(--app-bg-alt, #0f172a)',
                    }}
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
                )}

                {/* Desktop header */}
                {isDesktop && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.625rem 1rem',
                      flexShrink: 0,
                      borderBottom: '1px solid var(--card-border, #1e293b)',
                    }}
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
                )}

                {/* Body — explicit inline flex direction based on isDesktop */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: isDesktop ? 'row' : 'column',
                    flex: '1 1 auto',
                    overflow: 'hidden',
                    minHeight: 0,
                    position: 'relative',
                  }}
                >
                  {/* Loading overlay */}
                  {imgLoading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        background: 'var(--app-bg-alt, #0f172a)',
                      }}
                    >
                      <div className="w-64 flex flex-col gap-3">
                        <div className="h-3 rounded-full animate-pulse" style={{ background: 'var(--card-border, #1e293b)', width: '100%' }} />
                        <div className="h-3 rounded-full animate-pulse" style={{ background: 'var(--card-border, #1e293b)', width: '80%' }} />
                        <div className="h-3 rounded-full animate-pulse" style={{ background: 'var(--card-border, #1e293b)', width: '90%' }} />
                        <div className="h-3 rounded-full animate-pulse" style={{ background: 'var(--card-border, #1e293b)', width: '70%' }} />
                      </div>
                      <Loader2 size={20} className="animate-spin text-slate-600 mt-2" />
                    </div>
                  )}

                  {/* LEFT PANEL — problem */}
                  <div
                    style={{
                      width: isDesktop ? '62%' : '100%',
                      height: isDesktop ? '100%' : '52%',
                      flexShrink: 0,
                      flexGrow: 0,
                      overflowY: 'auto',
                      borderRight: isDesktop ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      borderBottom: isDesktop ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      minWidth: 0,
                      minHeight: 0,
                    }}
                  >
                    {selected.image_url && !imgError ? (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <img
                          key={selected.id}
                          src={selected.image_url}
                          alt="Problem"
                          style={{
                            flex: '1 1 auto',
                            width: '100%',
                            objectFit: 'contain',
                            cursor: 'zoom-in',
                            minHeight: 0,
                          }}
                          onClick={() => setLightbox(true)}
                          onLoad={() => setImgLoading(false)}
                          onError={() => { setImgError(true); setImgLoading(false) }}
                        />
                        {!imgLoading && (
                          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#475569', padding: '0.375rem 0', flexShrink: 0 }}>

                          </p>
                        )}
                      </div>
                    ) : selected.question ? (
                      <p style={{ padding: '1.5rem', whiteSpace: 'pre-wrap', fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.625 }}>
                        {selected.question}
                      </p>
                    ) : (
                      <div
                        style={{
                          margin: '1.5rem',
                          borderRadius: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#475569',
                          fontSize: '0.875rem',
                          minHeight: 180,
                          border: '2px dashed var(--card-border, #1e293b)',
                        }}
                      >
                        problem image
                      </div>
                    )}
                  </div>

                  {/* RIGHT PANEL — answer */}
                  <div
                    style={{
                      width: isDesktop ? '38%' : '100%',
                      height: isDesktop ? '100%' : 'auto',
                      flex: isDesktop ? '0 0 38%' : '1 1 auto',
                      padding: isDesktop ? '1.5rem' : '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      overflowY: 'auto',
                      background: 'var(--app-bg-alt, #0f172a)',
                      minWidth: 0,
                      minHeight: 0,
                    }}
                  >
                    <p
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '1rem',
                        color: 'var(--text-3, #94a3b8)',
                      }}
                    >
                      Your Answer
                    </p>

                    {/* MC buttons */}
                    {!result && selected.type === 'mc' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {((selected.choices ?? []).length > 0
                          ? [...(selected.choices ?? [])].sort((a, b) => a.order_index - b.order_index)
                          : (['A', 'B', 'C', 'D'] as const).map((lbl, i) => ({
                              id: `fallback-${lbl}`,
                              label: lbl,
                              order_index: i,
                              is_correct: false,
                              problem_id: selected.id,
                              text: '',
                            }))
                        ).map(c => {
                          const isSelected = answer === c.label
                          return (
                            <button
                              key={c.id}
                              onClick={() => setAnswer(c.label)}
                              style={{
                                width: '3.5rem',
                                height: '3.5rem',
                                borderRadius: '0.75rem',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '1.125rem',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                ...(isSelected
                                  ? { color: '#3B82F6', background: 'rgba(59,130,246,0.08)', border: '2px solid #3B82F6' }
                                  : { color: 'var(--text-1, #f1f5f9)', background: 'var(--surface, #1e293b)', border: '2px solid var(--glass-border, #334155)' }),
                              }}
                            >
                              {c.label}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Input */}
                    {!result && selected.type === 'input' && (
                      <div style={{ marginBottom: '1rem' }}>
                        <input
                          type="text"
                          value={answer}
                          onChange={e => setAnswer(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && submit()}
                          placeholder="Enter your answer"
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            fontFamily: 'monospace',
                            fontSize: '1rem',
                            outline: 'none',
                            background: 'var(--surface, #1e293b)',
                            border: '2px solid #3B82F6',
                            color: 'var(--text-1, #f1f5f9)',
                            display: 'block',
                            boxSizing: 'border-box',
                          }}
                        />
                        <p style={{ fontSize: '0.75rem', marginTop: '0.375rem', color: 'var(--text-3, #94a3b8)' }}>
                          fraction · decimal · integer
                        </p>
                      </div>
                    )}

                    {/* Result panel */}
                    {result && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          {result.correct
                            ? <CheckCircle2 size={16} className="text-emerald-400" />
                            : <CircleX size={16} className="text-red-400" />}
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: result.correct ? '#34d399' : '#f87171' }}>
                            {result.correct ? 'Correct!' : 'Incorrect'}
                          </span>
                        </div>
                        <div
                          style={{
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            minHeight: '6rem',
                            background: 'var(--input-bg, #0f172a)',
                            border: '1px solid var(--card-border, #1e293b)',
                          }}
                        >
                          {result.explanation ? (
                            <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.625, color: 'var(--text-1, #f1f5f9)' }}>
                              {result.explanation}
                            </p>
                          ) : (
                            <div
                              style={{
                                height: '4rem',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                border: '2px dashed var(--card-border, #1e293b)',
                                color: 'var(--text-muted, #64748b)',
                              }}
                            >
                              solution image
                            </div>
                          )}
                        </div>
                        {!result.correct && selected.solution && (
                          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#34d399' }}>
                            Correct answer: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selected.solution}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Submit / Try Again — pinned to bottom */}
                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                      {!result ? (
                        <button
                          onClick={submit}
                          disabled={!answer || submitting}
                          style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '9999px',
                            fontWeight: 600,
                            fontSize: '1rem',
                            transition: 'all 0.2s',
                            cursor: answer && !submitting ? 'pointer' : 'not-allowed',
                            ...(answer && !submitting
                              ? { background: '#2563EB', color: '#fff', boxShadow: '0 0 20px rgba(37,99,235,0.4)', border: 'none' }
                              : { background: 'rgba(255,255,255,0.08)', color: 'var(--text-3, #94a3b8)', border: '1px solid var(--glass-border, #334155)' }),
                          }}
                        >
                          {submitting
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><Loader2 size={14} className="animate-spin" /> Submitting…</span>
                            : 'Submit Answer'}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setResult(null); setAnswer('') }}
                          style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '9999px',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            background: 'transparent',
                            border: '1px solid var(--glass-border, #334155)',
                            color: 'var(--text-2, #cbd5e1)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          Try Again
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ProblemErrorBoundary>
          </div>

          {/* Lightbox */}
          {lightbox && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'zoom-out',
                background: 'rgba(0,0,0,0.92)',
              }}
              onClick={() => setLightbox(false)}
            >
              <img
                src={selected.image_url!}
                alt="Problem expanded"
                style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '0.5rem' }}
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
        </>,
        document.body
      )}

      {/* Problem list */}
      <div className="c-card rounded-2xl overflow-hidden">
        {/* Column headers */}
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
          const isBookmarked = bookmarks.has(p.id)
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
              {/* # */}
              <span className="hidden md:block text-right text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                {rowNum}
              </span>

              {/* Difficulty */}
              <div className="flex-shrink-0">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={diffStyle(p.difficulty)}>
                  {p.difficulty}
                </span>
              </div>

              {/* Question preview */}
              <p className="flex-1 min-w-0 text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {p.title || p.question || '—'}
              </p>

              {/* Domain · Topic */}
              <p className="hidden md:block text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {[p.category, p.topic].filter(Boolean).join(' · ') || '—'}
              </p>

              {/* Status + bookmark */}
              <div className="flex items-center justify-end gap-2 flex-shrink-0">
                {attempted && (
                  correct
                    ? <Check size={13} strokeWidth={2.5} className="text-emerald-500 flex-shrink-0" />
                    : <X size={13} strokeWidth={2.5} className="text-red-400 flex-shrink-0" />
                )}
                <button
                  onClick={e => toggleBookmark(e, p.id)}
                  disabled={bookmarkLoading.has(p.id)}
                  className="p-1 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                  style={{ color: isBookmarked ? '#EAB308' : 'var(--text-muted)' }}
                  title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                >
                  {bookmarkLoading.has(p.id)
                    ? <Loader2 size={14} className="animate-spin" />
                    : isBookmarked
                      ? <BookmarkCheck size={14} />
                      : <Bookmark size={14} />}
                </button>
              </div>
            </div>
          )
        })}

        {paginated.length === 0 && (
          <div className="py-20 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No problems found
          </div>
        )}
      </div>

      {/* Free tier unlock banner */}
      {!isSubscribed && (
        <div
          style={{
            marginTop: '1.5rem',
            borderRadius: '1rem',
            padding: '1.5rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(29,78,216,0.06))',
            border: '1px solid rgba(59,130,246,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '9999px', background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Lock size={15} strokeWidth={2} style={{ color: '#93C5FD' }} />
            </div>
            <div>
              <p style={{ color: '#E2E8F0', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.15rem' }}>
                You're viewing the 40 free problems
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Upgrade to Pro to unlock all problems and full analytics.
              </p>
            </div>
          </div>
          <a
            href="/student/subscription"
            style={{
              flexShrink: 0,
              padding: '0.625rem 1.25rem',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.825rem',
              boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Unlock more with Pro
          </a>
        </div>
      )}

      {/* Bottom pagination */}
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