'use client'

import { useState } from 'react'
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
    setShowForm(false)
    setLoading(false)
  }

  async function handleDelete(p: ProblemWithChoices) {
    if (!confirm(`Delete "${p.title ?? p.question.slice(0, 40)}"? This cannot be undone.`)) return
    await supabase.from('choices').delete().eq('problem_id', p.id)
    await supabase.from('problems').delete().eq('id', p.id)
    await reload()
  }

  const displayed = filterDiff === 'all' ? problems : problems.filter(p => p.difficulty === filterDiff)

  const diffColor = (d: string) => ({
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  }[d] ?? '')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Problems</h1>
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
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
            + Add Problem
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 mx-4">
            <h2 className="text-lg font-semibold mb-4">{editProblem ? 'Edit Problem' : 'Add Problem'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Title (optional)"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
                placeholder="Question *"
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Dropdown
                  value={form.type}
                  onChange={v => setForm(f => ({ ...f, type: v as 'mc' | 'input' }))}
                  options={[
                    { value: 'mc', label: 'Multiple Choice' },
                    { value: 'input', label: 'Input' },
                  ]}
                />
                <Dropdown
                  value={form.difficulty}
                  onChange={v => setForm(f => ({ ...f, difficulty: v as 'easy' | 'medium' | 'hard' }))}
                  options={[
                    { value: 'easy', label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'hard', label: 'Hard' },
                  ]}
                />
                <Dropdown
                  value={form.category}
                  onChange={v => setForm(f => ({ ...f, category: v as ProblemCategory | '' }))}
                  options={[
                    { value: '', label: 'No category' },
                    ...CATEGORIES.map(c => ({ value: c, label: c })),
                  ]}
                />
                <input
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Topic"
                  value={form.topic}
                  onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                />
              </div>

              {form.type === 'mc' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Choices (check the correct one)</p>
                  {form.choices.map((c, i) => (
                    <div key={c.label} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct"
                        checked={c.is_correct}
                        onChange={() => setForm(f => ({ ...f, choices: f.choices.map((ch, j) => ({ ...ch, is_correct: j === i })) }))}
                        className="accent-blue-600"
                      />
                      <span className="text-sm font-medium text-slate-700 w-4">{c.label}</span>
                      <input
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                        placeholder={`Choice ${c.label}`}
                        value={c.choice_text}
                        onChange={e => setForm(f => ({ ...f, choices: f.choices.map((ch, j) => j === i ? { ...ch, choice_text: e.target.value } : ch) }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              <input
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Solution (correct answer) *"
                value={form.solution}
                onChange={e => setForm(f => ({ ...f, solution: e.target.value }))}
              />
              <textarea
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
                placeholder="Explanation (shown after wrong answer)"
                value={form.explanation}
                onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={loading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {loading ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Question</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Difficulty</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Topic</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(p => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 max-w-sm">
                  {p.title && <p className="font-medium text-slate-900">{p.title}</p>}
                  <p className="text-slate-500 truncate">{p.question}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium uppercase">{p.type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${diffColor(p.difficulty)}`}>{p.difficulty}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{p.category ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{p.topic ?? '—'}</td>
                <td className="px-4 py-3 flex gap-2 justify-end">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => handleDelete(p)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No problems yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
