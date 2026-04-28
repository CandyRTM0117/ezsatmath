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

export default function SubscriptionClient({
  isSubscribed: initial,
}: {
  isSubscribed: boolean
}) {
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
      setError(data.error ?? 'Failed to update subscription. Please try again.')
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
        <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>
        <p className="text-slate-500 mt-1">Choose the plan that works best for you.</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* Free Plan */}
        <div className={`relative bg-white rounded-2xl border-2 p-7 flex flex-col ${!isSubscribed ? 'border-blue-500 shadow-md' : 'border-slate-200'}`}>
          {!isSubscribed && (
            <span className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              Current Plan
            </span>
          )}
          <div className="mb-5">
            <p className="text-lg font-bold text-slate-900">Free</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">$0 <span className="text-sm font-normal text-slate-400">/ month</span></p>
          </div>
          <ul className="space-y-2.5 flex-1 mb-7">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                <span className="text-slate-400 flex-shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
          {isSubscribed ? (
            <button
              onClick={() => toggle(false)}
              disabled={loading}
              className="w-full py-2.5 border-2 border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? 'Updating…' : 'Downgrade to Free'}
            </button>
          ) : (
            <div className="w-full py-2.5 text-center text-sm font-medium text-slate-400 bg-slate-50 rounded-xl">
              Your current plan
            </div>
          )}
        </div>

        {/* Pro Plan */}
        <div className={`relative bg-white rounded-2xl border-2 p-7 flex flex-col ${isSubscribed ? 'border-blue-500 shadow-md' : 'border-slate-200'}`}>
          {isSubscribed && (
            <span className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              Current Plan
            </span>
          )}
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-slate-900">Pro</p>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Recommended</span>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">$10 <span className="text-sm font-normal text-slate-400">/ month</span></p>
          </div>
          <ul className="space-y-2.5 flex-1 mb-7">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                <span className="text-blue-500 flex-shrink-0 font-bold">✓</span>
                {f}
              </li>
            ))}
          </ul>
          {isSubscribed ? (
            <div className="w-full py-2.5 text-center text-sm font-semibold text-blue-700 bg-blue-50 rounded-xl border border-blue-200">
              Active — Pro Plan
            </div>
          ) : (
            <button
              onClick={() => toggle(true)}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm disabled:opacity-50 transition-colors"
            >
              {loading ? 'Updating…' : 'Upgrade to Pro — $10/month'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
