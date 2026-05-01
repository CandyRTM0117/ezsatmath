'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Dropdown from '@/components/ui/Dropdown'
import type { Problem, Choice, ProblemCategory } from '@/types'

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
  choices: [
    { label: 'A', choice_text: '', is_correct: false },
    { label: 'B', choice_text: '', is_correct: false },
    { label: 'C', choice_text: '', is_correct: false },
    { label: 'D', choice_text: '', is_correct: false },
  ],
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#E2E8F0',
}

const diffStyle = (d: string): React.CSSProperties => ({
  easy:   { background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' },
  medium: { background: 'rgba(245,158,11,0.12)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.25)' },
  hard:   { background: 'rgba(239,68,68,0.12)',  color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' },
}[d] ?? {})

export default function ProblemsClient({ initialProblems }: { initialProblems: ProblemWithChoices[] }) {
  const [problems, setProblems] = useState<ProblemWithChoices[]>(initialProblems)
  const [showForm, setShowForm] = useState(false)
  const [editProblem, setEditProblem] = useState<ProblemWithChoices | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterDiff, setFilterDiff] = useState('all')

  const supabase = createClient()

  async function reload() {
    const { data } = await supabase
      .from('problems')
      .select('*, choices(*)')
      .order('order_index', { ascending: true })
    setProblems(data ?? [])
  }

  function openAdd() {
    setEditProblem(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
    document.body.classList.add('modal-open')
  }

  function openEdit(p: ProblemWithChoices) {
    setEditProblem(p)
    const sortedChoices = ['A', 'B', 'C', 'D'].map(label => {
      const c = p.choices?.find(ch => ch.label === label)
      return { label, choice_text: c?.choice_text ?? '', is_correct: c?.is_correct ?? false }
    })
    setForm({
      title: p.title ?? '',
      question: p.question,
      type: p.type,
      difficulty: p.difficulty,
      category: p.category ?? '',
      topic: p.topic ?? '',
      solution: p.solution,
      explanation: p.explanation ?? '',
      choices: sortedChoices,
    })
    setError('')
    setShowForm(true)
    document.body.classList.add('modal-open')
  }

  function closeForm() {
    setShowForm(false)
    document.body.classList.remove('modal-open')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (form.type === 'mc' && !form.choices.some(c => c.is_correct)) {
      setError('Mark at least one correct choice')
      setLoading(false)
      return
    }

    if (editProblem) {
      const { error: err } = await supabase
        .from('problems')
        .update({
          title: form.title || null,
          question: form.question,
          type: form.type,
          difficulty: form.difficulty,
          category: form.category || null,
          topic: form.topic || null,
          solution: form.solution,
          explanation: form.explanation || null,
        })
        .eq('id', editProblem.id)

      if (err) { setError(err.message); setLoading(false); return }

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
        .insert({
          title: form.title || null,
          question: form.question,
          type: form.type,
          difficulty: form.difficulty,
          category: form.category || null,
          topic: form.topic || null,
          solution: form.solution,
          explanation: form.explanation || null,
        })
        .select()
        .single()

      if (err || !newProblem) { setError(err?.message ?? 'Failed'); setLoading(false); return }

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

  async function handleDelete(p: ProblemWithChoices) {
    if (!confirm(`Delete "${p.title ?? p.question.slice(0, 40)}"? This cannot be undone.`)) return
    await supabase.from('choices').delete().eq('problem_id', p.id)
    await supabase.from('problems').delete().eq('id', p.id)
    await reload()
  }

  const displayed = filterDiff === 'all' ? problems : problems.filter(p => p.difficulty === filterDiff)

  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(59,130,246,0.5)'
  }
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.1)'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Problems
        </h1>
        <div className="flex items-center gap-3">
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
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}
          >
            <Plus size={14} strokeWidth={2.5} /> Add Problem
          </button>
        </div>
      </div>

      {showForm && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8 px-4 fade-in" onClick={closeForm}>
          <div
            className="rounded-2xl w-full max-w-2xl p-7 zoom-in-95"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0F172A',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-extrabold text-white tracking-tight">{editProblem ? 'Edit Problem' : 'Add Problem'}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
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

              {form.type === 'mc' && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Choices (check the correct one)</p>
                  {form.choices.map((c, i) => (
                    <div key={c.label} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct"
                        checked={c.is_correct}
                        onChange={() => setForm(f => ({ ...f, choices: f.choices.map((ch, j) => ({ ...ch, is_correct: j === i })) }))}
                        className="accent-blue-500"
                      />
                      <span className="text-sm font-bold text-slate-400 w-4">{c.label}</span>
                      <input
                        className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-all"
                        style={inputStyle}
                        placeholder={`Choice ${c.label}`}
                        value={c.choice_text}
                        onChange={e => setForm(f => ({ ...f, choices: f.choices.map((ch, j) => j === i ? { ...ch, choice_text: e.target.value } : ch) }))}
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
                placeholder="Explanation (shown after wrong answer)"
                value={form.explanation}
                onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />

              {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 font-bold text-white rounded-full text-sm transition-all duration-200 disabled:opacity-50 hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 20px rgba(59,130,246,0.35)' }}
                >
                  {loading ? (<span className="inline-flex items-center justify-center gap-2"><Loader2 size={12} className="animate-spin" /> Saving…</span>) : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-slate-200 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <tr>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Question</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Type</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Difficulty</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Category</th>
              <th className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Topic</th>
              <th className="px-5 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(p => (
              <tr key={p.id} className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]">
                <td className="px-5 py-4 max-w-sm">
                  {p.title && <p className="font-semibold text-white">{p.title}</p>}
                  <p className="text-slate-400 truncate">{p.question}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.08)' }}>{p.type}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold capitalize" style={diffStyle(p.difficulty)}>{p.difficulty}</span>
                </td>
                <td className="px-5 py-4 text-slate-400">{p.category ?? '—'}</td>
                <td className="px-5 py-4 text-slate-400">{p.topic ?? '—'}</td>
                <td className="px-5 py-4 flex gap-3 justify-end">
                  <button onClick={() => openEdit(p)} className="text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors">Edit</button>
                  <button onClick={() => handleDelete(p)} className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors">Delete</button>
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No problems yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
