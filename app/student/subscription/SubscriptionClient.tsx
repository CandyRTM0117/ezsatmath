'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Subscription</h1>
        <p className="text-slate-500 mt-1.5">Choose the plan that works best for you.</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* Free */}
        <div
          className="relative rounded-2xl p-7 flex flex-col transition-all duration-200"
          style={!isSubscribed
            ? { border: '2px solid #3B82F6', background: 'white', boxShadow: '0 0 0 4px rgba(59,130,246,0.08)' }
            : { border: '2px solid #E2E8F0', background: 'white' }}
        >
          {!isSubscribed && (
            <span className="absolute -top-3 left-6 text-white text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
              Current Plan
            </span>
          )}
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Free</p>
            <p className="text-4xl font-extrabold text-slate-900">$0 <span className="text-base font-normal text-slate-400">/ month</span></p>
          </div>
          <ul className="space-y-2.5 flex-1 mb-7">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                <span className="text-slate-400 shrink-0 font-bold">✓</span>{f}
              </li>
            ))}
          </ul>
          {isSubscribed ? (
            <button
              onClick={() => toggle(false)}
              disabled={loading}
              className="w-full py-3 border-2 border-red-300 text-red-600 hover:bg-red-50 rounded-full text-sm font-bold disabled:opacity-50 transition-all min-h-[44px]"
            >
              {loading ? 'Updating…' : 'Downgrade to Free'}
            </button>
          ) : (
            <div className="w-full py-3 text-center text-sm font-semibold text-blue-600 bg-blue-50 rounded-full border border-blue-200">
              Your current plan ✓
            </div>
          )}
        </div>

        {/* Pro */}
        <div
          className="relative rounded-2xl p-7 flex flex-col transition-all duration-200"
          style={isSubscribed
            ? {
                border: '2px solid #3B82F6',
                background: 'linear-gradient(145deg, rgba(59,130,246,0.05), white)',
                boxShadow: '0 0 40px rgba(59,130,246,0.2), 0 0 0 4px rgba(59,130,246,0.1)',
              }
            : {
                border: '2px solid #E2E8F0',
                background: 'white',
              }}
        >
          {isSubscribed && (
            <span className="absolute -top-3 left-6 text-white text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
              Current Plan
            </span>
          )}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Pro</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-blue-700"
                style={{ background: 'rgba(59,130,246,0.12)' }}>
                Recommended
              </span>
            </div>
            <p className="text-4xl font-extrabold text-slate-900">$10 <span className="text-base font-normal text-slate-400">/ month</span></p>
          </div>
          <ul className="space-y-2.5 flex-1 mb-7">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                <span className="text-blue-500 shrink-0 font-bold">✓</span>{f}
              </li>
            ))}
          </ul>
          {isSubscribed ? (
            <div className="w-full py-3 text-center text-sm font-bold text-blue-700 rounded-full"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}>
              ✦ Active — Pro Plan
            </div>
          ) : (
            <button
              onClick={() => toggle(true)}
              disabled={loading}
              className="w-full py-3 font-bold text-white rounded-full text-sm disabled:opacity-50 transition-all hover:scale-105 active:scale-95 min-h-[44px]"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating…
                </span>
              ) : 'Upgrade to Pro — $10/month →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
