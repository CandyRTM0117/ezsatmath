'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Loader2, AlertTriangle, CheckCircle, XCircle, Clock, ImageOff, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Dropdown from '@/components/ui/Dropdown'
import type { Problem, Choice, ProblemCategory, ProblemStatus } from '@/types'

type ProblemWithChoices = Problem & { choices?: Choice[] }

const CATEGORIES: ProblemCategory[] = ['Algebra', 'Trigonometry', 'Data Analytics', 'Advanced Math']

const EMPTY_FORM = {
  title: '',
  question: '',
  type: 'mc' as 'mc' | 'input',
  difficulty: 'easy' as 'easy' | 'medium' | 'hard',
  category: '' as ProblemCategory | '',
  topic: '',
  solution: '',
  explanation: '',
  explanation_mn: '',
  status: '' as ProblemStatus | '',
  choices: [
    { label: 'A', choice_text: '', is_correct: false },
    { label: 'B', choice_text: '', is_correct: false },
    { label: 'C', choice_text: '', is_correct: false },
    { label: 'D', choice_text: '', is_correct: false },
  ],
}

const inputStyle: React.CSSProperties = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--input-color)',
}

const diffStyle = (d: string): React.CSSProperties => ({
  easy:   { background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' },
  medium: { background: 'rgba(245,158,11,0.12)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.25)' },
  hard:   { background: 'rgba(239,68,68,0.12)',  color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' },
}[d] ?? {})

const STATUS_CONFIG = {
  approved:     { label: 'Approved',     color: '#34D399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)',  Icon: CheckCircle  },
  needs_review: { label: 'Needs Review', color: '#FBBF24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)',  Icon: AlertTriangle },
  error:        { label: 'Error',        color: '#F87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',   Icon: XCircle      },
} as const

function statusBadgeStyle(s: string | null | undefined): React.CSSProperties {
  const cfg = STATUS_CONFIG[s as ProblemStatus]
  if (!cfg) return { background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }
  return { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }
}

// null OR undefined — both mean "no status set"
function hasNoStatus(s: string | null | undefined): boolean {
  return s == null || s === ''
}

const supabase = createClient()

async function fetchAllProblems(): Promise<Problem[]> {
  const PAGE = 1000
  let from = 0
  const all: Problem[] = []
  while (true) {
    const { data } = await supabase
      .from('problems')
      .select('*')
      .order('order_index', { ascending: true })
      .range(from, from + PAGE - 1)
    if (!data?.length) break
    all.push(...(data as Problem[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

export default function ProblemsClient({ initialProblems }: { initialProblems: Problem[] }) {
  const [problems, setProblems] = useState<Problem[]>(initialProblems)
  const [showForm, setShowForm] = useState(false)
  const [editProblem, setEditProblem] = useState<ProblemWithChoices | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterDiff, setFilterDiff] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [imageUrlDraft, setImageUrlDraft] = useState('')
  const [imageUrlSaving, setImageUrlSaving] = useState(false)
  const [imageUrlSaved, setImageUrlSaved] = useState(false)

  async function reload() {
    setProblems(await fetchAllProblems())
  }

  function openAdd() {
    setEditProblem(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
    document.body.classList.add('modal-open')
  }

  async function openEdit(p: Problem) {
    setFormError('')
    setImageUrlDraft(p.image_url ?? '')
    setImageUrlSaved(false)
    // show modal immediately with the problem data, then load choices
    setEditProblem(p)
    setForm({
      title: p.title ?? '',
      question: p.question,
      type: p.type,
      difficulty: p.difficulty,
      category: p.category ?? '',
      topic: p.topic ?? '',
      solution: p.solution,
      explanation: p.explanation ?? '',
      explanation_mn: p.explanation_mn ?? '',
      status: p.status ?? '',
      choices: [
        { label: 'A', choice_text: '', is_correct: false },
        { label: 'B', choice_text: '', is_correct: false },
        { label: 'C', choice_text: '', is_correct: false },
        { label: 'D', choice_text: '', is_correct: false },
      ],
    })
    setShowForm(true)
    document.body.classList.add('modal-open')

    // load choices asynchronously
    const { data: choices } = await supabase
      .from('choices')
      .select('*')
      .eq('problem_id', p.id)
      .order('order_index', { ascending: true })

    if (choices?.length) {
      const sortedChoices = ['A', 'B', 'C', 'D'].map(label => {
        const c = choices.find((ch: Choice) => ch.label === label)
        return { label, choice_text: c?.choice_text ?? '', is_correct: c?.is_correct ?? false }
      })
      setForm(f => ({ ...f, choices: sortedChoices }))
    }
  }

  function closeForm() {
    setShowForm(false)
    document.body.classList.remove('modal-open')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setLoading(true)

    if (form.type === 'mc' && !form.choices.some(c => c.is_correct)) {
      setFormError('Mark at least one correct choice')
      setLoading(false)
      return
    }

    const problemPayload = {
      title: form.title || null,
      question: form.question,
      type: form.type,
      difficulty: form.difficulty,
      category: form.category || null,
      topic: form.topic || null,
      solution: form.solution,
      explanation: form.explanation || null,
      explanation_mn: form.explanation_mn || null,
      status: form.status || null,
    }

    if (editProblem) {
      const { data: updated, error: err } = await supabase
        .from('problems')
        .update(problemPayload)
        .eq('id', editProblem.id)
        .select()

      if (err) { setFormError(err.message); setLoading(false); return }
      if (!updated?.length) { setFormError('Update failed: no rows changed. Check RLS policies.'); setLoading(false); return }

      if (form.type === 'mc') {
        await supabase.from('choices').delete().eq('problem_id', editProblem.id)
        await supabase.from('choices').insert(
          form.choices.filter(c => c.choice_text).map((c, i) => ({
            problem_id: editProblem.id,
            label: c.label,
            choice_text: c.choice_text,
            is_correct: c.is_correct,
            order_index: i,
          }))
        )
      }
    } else {
      const { data: newProblem, error: err } = await supabase
        .from('problems')
        .insert(problemPayload)
        .select()
        .single()

      if (err || !newProblem) { setFormError(err?.message ?? 'Failed'); setLoading(false); return }

      if (form.type === 'mc') {
        await supabase.from('choices').insert(
          form.choices.filter(c => c.choice_text).map((c, i) => ({
            problem_id: newProblem.id,
            label: c.label,
            choice_text: c.choice_text,
            is_correct: c.is_correct,
            order_index: i,
          }))
        )
      }
    }

    await reload()
    closeForm()
    setLoading(false)
  }

  async function handleSaveImageUrl() {
    if (!editProblem) return
    setImageUrlSaving(true)
    const { error } = await supabase
      .from('problems')
      .update({ image_url: imageUrlDraft || null })
      .eq('id', editProblem.id)
    if (!error) {
      const updated = { ...editProblem, image_url: imageUrlDraft || null }
      setEditProblem(updated)
      setProblems(prev => prev.map(p => p.id === editProblem.id ? { ...p, image_url: imageUrlDraft || null } : p))
      setImageUrlSaved(true)
      setTimeout(() => setImageUrlSaved(false), 2000)
    }
    setImageUrlSaving(false)
  }

  async function handleDelete(p: Problem) {
    if (!confirm(`Delete "${p.title ?? p.question.slice(0, 40)}"? This cannot be undone.`)) return
    await supabase.from('choices').delete().eq('problem_id', p.id)
    await supabase.from('problems').delete().eq('id', p.id)
    await reload()
  }

  // duplicate detection — same title OR same image_url
  const duplicateIds = useMemo(() => {
    const seen = new Map<string, string[]>()
    for (const p of problems) {
      if (p.title) {
        if (!seen.has(p.title)) seen.set(p.title, [])
        seen.get(p.title)!.push(p.id)
      }
    }
    const seenImg = new Map<string, string[]>()
    for (const p of problems) {
      if (p.image_url) {
        if (!seenImg.has(p.image_url)) seenImg.set(p.image_url, [])
        seenImg.get(p.image_url)!.push(p.id)
      }
    }
    const ids = new Set<string>()
    for (const [, group] of seen) if (group.length > 1) group.forEach(id => ids.add(id))
    for (const [, group] of seenImg) if (group.length > 1) group.forEach(id => ids.add(id))
    return ids
  }, [problems])

  // counts — uses loose null check to catch both null AND undefined from Supabase
  const counts = {
    all:          problems.length,
    approved:     problems.filter(p => p.status === 'approved').length,
    needs_review: problems.filter(p => p.status === 'needs_review' || hasNoStatus(p.status)).length,
    error:        problems.filter(p => p.status === 'error').length,
    duplicates:   duplicateIds.size,
  }

  const afterDiff = filterDiff === 'all' ? problems : problems.filter(p => p.difficulty === filterDiff)
  const displayed = filterStatus === 'all'
    ? afterDiff
    : filterStatus === 'duplicates'
      ? afterDiff.filter(p => duplicateIds.has(p.id))
      : filterStatus === 'needs_review'
        ? afterDiff.filter(p => p.status === 'needs_review' || hasNoStatus(p.status))
        : afterDiff.filter(p => p.status === filterStatus)

  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(59,130,246,0.5)'
  }
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'var(--input-border)'
  }

  const hasImage = editProblem && (editProblem.image_url || editProblem.choices_image_url)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Problems
        </h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}
        >
          <Plus size={14} strokeWidth={2.5} /> Add Problem
        </button>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* All tab */}
        <button
          onClick={() => setFilterStatus('all')}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150"
          style={filterStatus === 'all'
            ? { background: 'rgba(59,130,246,0.18)', color: '#60A5FA', border: '1.5px solid rgba(59,130,246,0.45)', boxShadow: '0 0 0 3px rgba(59,130,246,0.08)' }
            : { background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1.5px solid var(--input-border)' }}
        >
          <Clock size={11} strokeWidth={2.5} />
          All
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-extrabold"
            style={filterStatus === 'all'
              ? { background: 'rgba(59,130,246,0.25)', color: '#93C5FD' }
              : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
            {counts.all}
          </span>
        </button>

        {(Object.entries(STATUS_CONFIG) as [ProblemStatus, typeof STATUS_CONFIG[ProblemStatus]][]).map(([key, cfg]) => {
          const active = filterStatus === key
          const { Icon } = cfg
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150"
              style={active
                ? { background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}`, boxShadow: `0 0 0 3px ${cfg.bg}` }
                : { background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1.5px solid var(--input-border)' }}
            >
              <Icon size={11} strokeWidth={2.5} />
              {cfg.label}
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-extrabold"
                style={active
                  ? { background: cfg.bg, color: cfg.color }
                  : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
              >
                {counts[key]}
              </span>
            </button>
          )
        })}

        {/* Duplicates tab */}
        {counts.duplicates > 0 && (
          <button
            onClick={() => setFilterStatus('duplicates')}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150"
            style={filterStatus === 'duplicates'
              ? { background: 'rgba(168,85,247,0.15)', color: '#C084FC', border: '1.5px solid rgba(168,85,247,0.4)', boxShadow: '0 0 0 3px rgba(168,85,247,0.08)' }
              : { background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1.5px solid var(--input-border)' }}
          >
            <Copy size={11} strokeWidth={2.5} />
            Duplicates
            <span
              className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-extrabold"
              style={filterStatus === 'duplicates'
                ? { background: 'rgba(168,85,247,0.2)', color: '#C084FC' }
                : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
            >
              {counts.duplicates}
            </span>
          </button>
        )}

        <div className="ml-auto">
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
      </div>

      {/* Edit / Add modal */}
      {showForm && createPortal(
        <div
          className="c-modal-backdrop fixed inset-0 flex items-start justify-center z-50 overflow-y-auto py-8 px-4 fade-in"
          onClick={closeForm}
        >
          <div
            className={`c-modal rounded-2xl w-full p-0 zoom-in-95 ${hasImage ? 'max-w-5xl' : 'max-w-2xl'}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--input-border)' }}>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  {editProblem ? 'Edit Problem' : 'Add Problem'}
                </h2>
                {editProblem && (
                  <div className="flex items-center gap-2">
                    {editProblem.title && (
                      <span className="text-xs font-mono text-slate-400">{editProblem.title}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={diffStyle(editProblem.difficulty)}>
                      {editProblem.difficulty}
                    </span>
                    {editProblem.status && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={statusBadgeStyle(editProblem.status)}>
                        {STATUS_CONFIG[editProblem.status]?.label ?? editProblem.status}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button onClick={closeForm} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {/* Modal body */}
            <div className={`${hasImage ? 'grid grid-cols-[1fr_380px]' : ''}`}>

              {/* Left: image preview (only when editing a problem with images) */}
              {hasImage && (
                <div className="p-5 space-y-3 overflow-y-auto max-h-[80vh]" style={{ borderRight: '1px solid var(--input-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Problem Image</p>
                    {imageUrlDraft !== (editProblem.image_url ?? '') && (
                      <span className="text-[10px] text-amber-400 font-semibold">Unsaved</span>
                    )}
                  </div>

                  {/* URL input + save */}
                  <div className="flex gap-2 mb-3">
                    <input
                      value={imageUrlDraft}
                      onChange={e => { setImageUrlDraft(e.target.value); setImageUrlSaved(false) }}
                      placeholder="Paste R2 image URL…"
                      className="flex-1 px-3 py-2 rounded-lg text-xs focus:outline-none transition-all font-mono"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={handleSaveImageUrl}
                      disabled={imageUrlSaving || imageUrlDraft === (editProblem.image_url ?? '')}
                      className="px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40"
                      style={imageUrlSaved
                        ? { background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }
                        : { background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#fff', border: 'none' }}
                    >
                      {imageUrlSaving
                        ? <Loader2 size={11} className="animate-spin" />
                        : imageUrlSaved
                          ? <><CheckCircle size={11} /> Saved</>
                          : 'Save'}
                    </button>
                  </div>

                  {/* Live preview */}
                  {imageUrlDraft ? (
                    <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--input-border)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrlDraft}
                        alt="Problem"
                        className="w-full h-auto block"
                        style={{ background: '#fff' }}
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                        onLoad={e => { (e.target as HTMLImageElement).style.opacity = '1' }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 h-40 rounded-xl text-slate-600" style={{ border: '1px dashed var(--input-border)' }}>
                      <ImageOff size={20} />
                      <span className="text-xs">No image</span>
                    </div>
                  )}

                  {editProblem.choices_image_url && editProblem.choices_image_url !== editProblem.image_url && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-4 mb-2">Choices Image</p>
                      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--input-border)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={editProblem.choices_image_url}
                          alt="Choices"
                          className="w-full h-auto block"
                          style={{ background: '#fff' }}
                        />
                      </div>
                    </>
                  )}

                  {/* Read-only metadata */}
                  {(editProblem.source || editProblem.claude_model || editProblem.validation_flags) && (
                    <div className="mt-4 space-y-2 rounded-xl p-3" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                      {editProblem.source && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Source</p>
                          <p className="text-xs text-slate-400 break-all mt-0.5">{editProblem.source}</p>
                        </div>
                      )}
                      {editProblem.claude_model && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Claude Model</p>
                          <p className="text-xs text-slate-400 mt-0.5">{editProblem.claude_model}</p>
                        </div>
                      )}
                      {editProblem.validation_flags && Object.keys(editProblem.validation_flags).length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Validation Flags</p>
                          <div className="mt-1 space-y-0.5">
                            {Object.entries(editProblem.validation_flags).map(([k, v]) => (
                              <p key={k} className="text-[11px] text-amber-400/80">
                                <span className="font-semibold">{k}:</span> {String(v)}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Right: form */}
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
                    style={inputStyle}
                    placeholder="Problem ID (e.g. SAT-001)"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                  <textarea
                    required
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm resize-none focus:outline-none transition-all"
                    style={inputStyle}
                    placeholder="Question *"
                    value={form.question}
                    onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Dropdown
                      value={form.type}
                      onChange={v => setForm(f => ({ ...f, type: v as 'mc' | 'input' }))}
                      options={[
                        { value: 'mc', label: 'Multiple Choice' },
                        { value: 'input', label: 'Input' },
                      ]}
                      className="w-full"
                    />
                    <Dropdown
                      value={form.difficulty}
                      onChange={v => setForm(f => ({ ...f, difficulty: v as 'easy' | 'medium' | 'hard' }))}
                      options={[
                        { value: 'easy', label: 'Easy' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'hard', label: 'Hard' },
                      ]}
                      className="w-full"
                    />
                    <Dropdown
                      value={form.category}
                      onChange={v => setForm(f => ({ ...f, category: v as ProblemCategory | '' }))}
                      options={[
                        { value: '', label: 'No category' },
                        ...CATEGORIES.map(c => ({ value: c, label: c })),
                      ]}
                      className="w-full"
                    />
                    <input
                      className="px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
                      style={inputStyle}
                      placeholder="Topic"
                      value={form.topic}
                      onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                  </div>

                  <Dropdown
                    value={form.status}
                    onChange={v => setForm(f => ({ ...f, status: v as ProblemStatus | '' }))}
                    options={[
                      { value: '', label: 'No status' },
                      { value: 'approved', label: '✓ Approved' },
                      { value: 'needs_review', label: '⚠ Needs Review' },
                      { value: 'error', label: '✕ Error' },
                    ]}
                    className="w-full"
                  />

                  {form.type === 'mc' && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        Choices — select correct answer
                      </p>
                      {form.choices.map((c, i) => (
                        <div key={c.label} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correct"
                            checked={c.is_correct}
                            onChange={() => setForm(f => ({
                              ...f,
                              choices: f.choices.map((ch, j) => ({ ...ch, is_correct: j === i }))
                            }))}
                            className="accent-blue-500"
                          />
                          <span
                            className="text-sm font-extrabold w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0"
                            style={c.is_correct
                              ? { background: 'rgba(59,130,246,0.2)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.4)' }
                              : { background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}
                          >
                            {c.label}
                          </span>
                          <input
                            className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-all"
                            style={inputStyle}
                            placeholder={`Choice ${c.label}`}
                            value={c.choice_text}
                            onChange={e => setForm(f => ({
                              ...f,
                              choices: f.choices.map((ch, j) => j === i ? { ...ch, choice_text: e.target.value } : ch)
                            }))}
                            onFocus={inputFocus}
                            onBlur={inputBlur}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
                    style={inputStyle}
                    placeholder="Solution (correct answer) *"
                    value={form.solution}
                    onChange={e => setForm(f => ({ ...f, solution: e.target.value }))}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />

                  <textarea
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm resize-none focus:outline-none transition-all"
                    style={inputStyle}
                    placeholder="Explanation (English)"
                    value={form.explanation}
                    onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />

                  <textarea
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm resize-none focus:outline-none transition-all"
                    style={inputStyle}
                    placeholder="Тайлбар (Монгол)"
                    value={form.explanation_mn}
                    onChange={e => setForm(f => ({ ...f, explanation_mn: e.target.value }))}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />

                  {formError && <p className="text-sm font-semibold text-red-400">{formError}</p>}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 font-bold text-white rounded-full text-sm transition-all duration-200 disabled:opacity-50 hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 20px rgba(59,130,246,0.35)' }}
                    >
                      {loading
                        ? <span className="inline-flex items-center justify-center gap-2"><Loader2 size={12} className="animate-spin" /> Saving…</span>
                        : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--input-textarea-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--input-bg)')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Table */}
      <div className="c-card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--table-header-border)' }}>
            <tr>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Question</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Type</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Difficulty</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Status</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Category</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Source</th>
              <th className="px-5 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(p => {
              const statusCfg = STATUS_CONFIG[p.status as ProblemStatus]
              const isDuplicate = duplicateIds.has(p.id)
              return (
                <tr key={p.id} className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
                  style={isDuplicate ? { background: 'rgba(168,85,247,0.04)' } : undefined}>
                  <td className="px-5 py-4 max-w-sm">
                    <div className="flex items-center gap-2">
                      {p.image_url && (
                        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border" style={{ borderColor: 'var(--input-border)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.image_url} alt="" className="w-full h-full object-cover" style={{ background: '#fff' }} />
                        </div>
                      )}
                      <div className="min-w-0">
                        {p.title && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="font-semibold text-white text-xs">{p.title}</p>
                            {isDuplicate && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(168,85,247,0.2)', color: '#C084FC', border: '1px solid rgba(168,85,247,0.3)' }}>DUP</span>
                            )}
                          </div>
                        )}
                        <p className="text-slate-400 truncate">{p.question}</p>
                        {p.validation_flags && Object.keys(p.validation_flags).length > 0 && (
                          <p className="text-[10px] text-amber-400/70 mt-0.5 truncate">
                            ⚠ {Object.keys(p.validation_flags).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest"
                      style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold capitalize" style={diffStyle(p.difficulty)}>
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold" style={statusBadgeStyle(p.status)}>
                      {statusCfg && <statusCfg.Icon size={10} strokeWidth={2.5} />}
                      {statusCfg ? statusCfg.label : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400">{p.category ?? '—'}</td>
                  <td className="px-5 py-4 text-slate-400 max-w-[120px] truncate">{p.source ?? '—'}</td>
                  <td className="px-5 py-4 flex gap-3 justify-end">
                    <button onClick={() => openEdit(p)} className="text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors">Edit</button>
                    <button onClick={() => handleDelete(p)} className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors">Delete</button>
                  </td>
                </tr>
              )
            })}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                  No problems{filterStatus !== 'all' ? ` with status "${STATUS_CONFIG[filterStatus as ProblemStatus]?.label ?? filterStatus}"` : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
