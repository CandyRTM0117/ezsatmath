'use client'

import { useState, useEffect, useMemo } from 'react'
import { Star, CheckCircle2, Circle, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Review {
  id: string
  rating: number
  body: string
  created_at: string
  user: { id: string; name: string | null; email: string } | null
}

const DONE_KEY = 'admin_reviews_done'

function loadDone(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]')) }
  catch { return new Set() }
}

function saveDone(s: Set<string>) {
  localStorage.setItem(DONE_KEY, JSON.stringify([...s]))
}

function Stars({ rating }: { rating: number }) {
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

export default function AdminReviewsClient({ reviews: initial }: { reviews: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initial)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => { setDone(loadDone()) }, [])

  function toggleDone(id: string) {
    setDone(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveDone(next)
      return next
    })
  }

  async function deleteReview(id: string) {
    if (deleting) return
    setDeleting(id)
    await supabase.from('reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
    setDone(prev => { const next = new Set(prev); next.delete(id); saveDone(next); return next })
    setDeleting(null)
  }

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null
  const doneCount = reviews.filter(r => done.has(r.id)).length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{
          background: 'linear-gradient(135deg, var(--text-1), var(--accent-violet))',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Reviews</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <p style={{ color: 'var(--text-3)', fontSize: '1rem' }}>
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
          {avg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Star size={15} strokeWidth={1.5} fill="var(--accent-cyan)" style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>{avg}</span>
              <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>avg</span>
            </div>
          )}
          {reviews.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={15} strokeWidth={1.75} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{doneCount}/{reviews.length} reviewed</span>
            </div>
          )}
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="c-card rounded-2xl p-14 text-center" style={{ color: 'var(--text-3)' }}>
          No reviews yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {reviews.map(r => {
            const isDone = done.has(r.id)
            const isDeleting = deleting === r.id
            const name = r.user?.name ?? r.user?.email ?? 'Unknown'
            const date = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            return (
              <div
                key={r.id}
                className="c-card rounded-2xl"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex', flexDirection: 'column', gap: '0.6rem',
                  opacity: isDone ? 0.55 : 1,
                  transition: 'opacity 0.2s',
                  position: 'relative',
                }}
              >
                {/* Top row: avatar + name + stars */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 999, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#0B0F25',
                      background: isDone
                        ? 'rgba(255,255,255,0.12)'
                        : 'linear-gradient(135deg, var(--accent-pearl), var(--accent-violet))',
                    }}>
                      {(name[0] ?? '?').toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{name}</p>
                  </div>
                  <Stars rating={r.rating} />
                </div>

                {/* Body */}
                <p className="text-sm" style={{
                  color: 'var(--text-2)', lineHeight: 1.6,
                  display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 4, overflow: 'hidden',
                  textDecoration: isDone ? 'line-through' : 'none',
                }}>
                  {r.body}
                </p>

                {/* Footer: date + actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{date}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {/* Done toggle */}
                    <button
                      onClick={() => toggleDone(r.id)}
                      title={isDone ? 'Mark as unread' : 'Mark as done'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.3rem 0.6rem', borderRadius: '0.45rem',
                        background: isDone ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isDone ? 'rgba(34,211,238,0.3)' : 'var(--glass-border)'}`,
                        color: isDone ? 'var(--accent-cyan)' : 'var(--text-3)',
                        fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isDone
                        ? <CheckCircle2 size={12} strokeWidth={2} />
                        : <Circle size={12} strokeWidth={2} />}
                      {isDone ? 'Done' : 'Mark done'}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteReview(r.id)}
                      disabled={!!deleting}
                      title="Delete review"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: '0.45rem',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-3)', cursor: deleting ? 'not-allowed' : 'pointer',
                        opacity: isDeleting ? 0.4 : 1, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!deleting) { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' } }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--glass-border)' }}
                    >
                      <Trash2 size={13} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
