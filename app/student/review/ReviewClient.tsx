'use client'

import { useState, useMemo } from 'react'
import { Star, Send, Plus, Pencil, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Review { id: string; rating: number; body: string; created_at: string }

function StarPicker({ rating, onChange }: { rating: number; onChange: (r: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || rating
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {[1,2,3,4,5].map(s => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(s)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
          >
            <Star
              size={38}
              strokeWidth={1.5}
              fill={s <= active ? 'var(--accent-cyan)' : 'none'}
              style={{
                color: s <= active ? 'var(--accent-cyan)' : 'var(--text-3)',
                filter: s <= active ? 'drop-shadow(0 0 8px var(--accent-cyan))' : 'none',
                transition: 'color 0.12s, fill 0.12s, filter 0.12s',
              }}
            />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
        </p>
      )}
    </div>
  )
}

function MiniStars({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={13} strokeWidth={1.5}
          fill={s <= rating ? 'var(--accent-cyan)' : 'none'}
          style={{ color: s <= rating ? 'var(--accent-cyan)' : 'var(--text-3)' }}
        />
      ))}
    </div>
  )
}

type FormMode = { type: 'new' } | { type: 'edit'; review: Review } | null

export default function ReviewClient({ userId, reviews: initial }: { userId: string; reviews: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initial)
  const [mode, setMode] = useState<FormMode>(null)
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  function openNew() {
    setRating(0)
    setBody('')
    setMode({ type: 'new' })
  }

  function openEdit(r: Review) {
    setRating(r.rating)
    setBody(r.body)
    setMode({ type: 'edit', review: r })
  }

  function cancel() {
    setMode(null)
  }

  async function submit() {
    if (!rating || !body.trim() || sending) return
    setSending(true)

    if (mode?.type === 'edit') {
      const { data } = await supabase
        .from('reviews')
        .update({ rating, body: body.trim() })
        .eq('id', mode.review.id)
        .select('id, rating, body, created_at')
        .single()
      if (data) setReviews(prev => prev.map(r => r.id === (data as Review).id ? data as Review : r))
    } else {
      const { data } = await supabase
        .from('reviews')
        .insert({ user_id: userId, rating, body: body.trim() })
        .select('id, rating, body, created_at')
        .single()
      if (data) setReviews(prev => [data as Review, ...prev])
    }

    setSending(false)
    setMode(null)
  }

  // ---- FORM ----
  if (mode !== null) {
    const isEdit = mode.type === 'edit'
    const canSubmit = rating > 0 && body.trim().length > 0 && !sending
    return (
      <div style={{ minHeight: 'calc(100vh - 8rem)', display: 'flex', flexDirection: 'column', padding: '2rem 0' }}>
        <div className="mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{
              background: 'linear-gradient(135deg, var(--text-1), var(--accent-violet))',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {isEdit ? 'Edit Review' : 'New Review'}
            </h1>
            <p className="mt-1" style={{ color: 'var(--text-3)', fontSize: '1rem' }}>
              {isEdit ? 'Update your rating and thoughts' : 'Tell us what you think and what we should improve'}
            </p>
          </div>
          <button
            onClick={cancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '0.5rem' }}
          >
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Your rating</p>
          <StarPicker rating={rating} onChange={setRating} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Your thoughts</p>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Share your experience — what you loved, what could be better, features you'd like to see…"
            style={{
              flex: 1, minHeight: '320px', width: '100%', resize: 'none',
              background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              borderRadius: '1rem', padding: '1.25rem 1.5rem',
              fontSize: '1rem', color: 'var(--input-color)', lineHeight: 1.7,
              outline: 'none', transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent-cyan)')}
            onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.85rem 2rem', borderRadius: '0.75rem',
              background: canSubmit ? 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))' : 'var(--input-bg)',
              color: canSubmit ? '#fff' : 'var(--text-3)',
              fontWeight: 700, fontSize: '0.95rem', border: 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: sending ? 0.6 : 1, transition: 'all 0.2s',
              boxShadow: canSubmit ? '0 4px 20px rgba(34,211,238,0.3)' : 'none',
            }}
          >
            <Send size={16} strokeWidth={2} />
            {sending ? 'Saving…' : isEdit ? 'Save Changes' : 'Submit Review'}
          </button>
        </div>
      </div>
    )
  }

  // ---- LIST ----
  return (
    <div>
      <div className="mb-8" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{
            background: 'linear-gradient(135deg, var(--text-1), var(--accent-violet))',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>My Reviews</h1>
          <p className="mt-2" style={{ color: 'var(--text-3)', fontSize: '1rem' }}>Your feedback helps us improve EzSAT</p>
        </div>
        <button
          onClick={openNew}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.7rem 1.4rem', borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
            color: '#fff', fontWeight: 700, fontSize: '0.875rem',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(34,211,238,0.25)',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          New Review
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="c-card rounded-2xl p-14 text-center" style={{ color: 'var(--text-3)' }}>
          <Star size={40} strokeWidth={1.25} style={{ margin: '0 auto 1rem', color: 'var(--text-3)' }} />
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-2)' }}>No reviews yet</p>
          <p className="text-sm">Click "New Review" to share your thoughts</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map(r => {
            const date = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            return (
              <div
                key={r.id}
                className="c-card rounded-2xl"
                style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <MiniStars rating={r.rating} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{date}</span>
                    <button
                      onClick={() => openEdit(r)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.35rem 0.75rem', borderRadius: '0.5rem',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-2)', fontSize: '0.75rem', fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; e.currentTarget.style.color = 'var(--accent-violet)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-2)' }}
                    >
                      <Pencil size={12} strokeWidth={2} />
                      Edit
                    </button>
                  </div>
                </div>
                <p style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{r.body}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
