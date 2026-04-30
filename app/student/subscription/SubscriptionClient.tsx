'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, Loader2, ArrowRight } from 'lucide-react'

const PRO_FEATURES = [
  'Unlock Analytics Dashboard',
  'Full Exam History & Score Breakdown',
  'Detailed Performance Insights',
  'Daily Activity Charts',
  'Priority Support',
  'Unlimited Exam Attempts',
]

const FREE_FEATURES = [
  'Practice Problems',
  'Basic Exam Mode',
  'Limited History',
]

export default function SubscriptionClient({ isSubscribed: initial }: { isSubscribed: boolean }) {
  const [isSubscribed, setIsSubscribed] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function toggle(subscribe: boolean) {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/subscription', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_subscribed: subscribe }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to update subscription.')
      setLoading(false)
      return
    }
    setIsSubscribed(subscribe)
    setLoading(false)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Subscription
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Choose the plan that works best for you.</p>
      </div>

      {error && (
        <div className="mb-6 px-5 py-3 rounded-2xl text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 max-w-3xl mx-auto">
        {/* Free */}
        <div
          className="relative rounded-2xl p-8 flex flex-col transition-all duration-300"
          style={!isSubscribed
            ? {
                background: 'linear-gradient(145deg, rgba(59,130,246,0.08), rgba(255,255,255,0.02))',
                border: '1px solid rgba(59,130,246,0.4)',
                boxShadow: '0 0 0 4px rgba(59,130,246,0.08), 0 24px 60px rgba(0,0,0,0.35)',
              }
            : {
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              }}
        >
          {!isSubscribed && (
            <span
              className="absolute -top-3 left-7 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 20px rgba(59,130,246,0.4)' }}
            >
              Current Plan
            </span>
          )}
          <div className="mb-7">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Free</p>
            <p className="text-5xl font-extrabold text-white tracking-tight">$0 <span className="text-base font-normal text-slate-500">/ month</span></p>
          </div>
          <ul className="space-y-3 flex-1 mb-8">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Check size={11} strokeWidth={2.5} className="text-slate-400" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          {isSubscribed ? (
            <button
              onClick={() => toggle(false)}
              disabled={loading}
              className="w-full py-3.5 rounded-full text-sm font-bold transition-all duration-200 disabled:opacity-50 min-h-[44px] hover:scale-[1.01]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.4)', color: '#F87171' }}
            >
              {loading ? 'Updating…' : 'Downgrade to Free'}
            </button>
          ) : (
            <div
              className="w-full py-3.5 text-center text-sm font-bold rounded-full"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#93C5FD' }}
            >
              Your current plan ✓
            </div>
          )}
        </div>

        {/* Pro */}
        <div
          className="relative rounded-2xl p-8 flex flex-col transition-all duration-300"
          style={isSubscribed
            ? {
                background: 'linear-gradient(145deg, rgba(59,130,246,0.15), rgba(29,78,216,0.06))',
                border: '1px solid rgba(59,130,246,0.5)',
                boxShadow: '0 0 60px rgba(59,130,246,0.25), 0 24px 60px rgba(0,0,0,0.4)',
              }
            : {
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              }}
        >
          {isSubscribed && (
            <span
              className="absolute -top-3 left-7 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 20px rgba(59,130,246,0.4)' }}
            >
              Current Plan
            </span>
          )}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Pro</p>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93C5FD' }}
              >
                Recommended
              </span>
            </div>
            <p className="text-5xl font-extrabold text-white tracking-tight">$10 <span className="text-base font-normal text-slate-500">/ month</span></p>
          </div>
          <ul className="space-y-3 flex-1 mb-8">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-sm text-slate-200">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.4)' }}
                >
                  <Check size={11} strokeWidth={2.5} className="text-blue-300" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          {isSubscribed ? (
            <div
              className="w-full py-3.5 text-center text-sm font-bold rounded-full inline-flex items-center justify-center gap-2"
              style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.4)', color: '#93C5FD' }}
            >
              <Sparkles size={14} strokeWidth={1.75} /> Active — Pro Plan
            </div>
          ) : (
            <button
              onClick={() => toggle(true)}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 font-bold text-white rounded-full text-sm disabled:opacity-50 transition-all duration-200 hover:scale-[1.02] active:scale-95 min-h-[44px]"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 12px 30px rgba(59,130,246,0.4)' }}
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Updating…</>
              ) : (
                <>Upgrade to Pro — $10/month <ArrowRight size={14} strokeWidth={2.5} /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
