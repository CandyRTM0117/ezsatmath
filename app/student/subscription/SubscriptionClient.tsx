'use client'

import { useState } from 'react'
import { Check, Sparkles, ArrowRight, X } from 'lucide-react'

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

function remainingDays(validUntil: string | null): number {
  if (!validUntil) return 0
  const diff = new Date(validUntil).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function SubscriptionClient({ isSubscribed, validUntil }: { isSubscribed: boolean; validUntil: string | null }) {
  const [showModal, setShowModal] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<'pro' | 'free' | null>(null)
  const days = remainingDays(validUntil)

  function requestChange(plan: 'pro' | 'free') {
    setPendingPlan(plan)
    setShowModal(true)
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Subscription
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Choose the plan that works best for you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 max-w-3xl mx-auto">
        {/* Free */}
        <div
          className={['relative rounded-2xl p-8 flex flex-col transition-all duration-300', !isSubscribed ? '' : 'c-card'].join(' ')}
          style={!isSubscribed
            ? {
                background: 'linear-gradient(145deg, rgba(59,130,246,0.08), rgba(255,255,255,0.02))',
                border: '1px solid rgba(59,130,246,0.4)',
                boxShadow: '0 0 0 4px rgba(59,130,246,0.08), 0 24px 60px rgba(0,0,0,0.35)',
              }
            : undefined}
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
            <p className="text-5xl font-extrabold text-white tracking-tight">0 ₮ <span className="text-base font-normal text-slate-500">/ month</span></p>
          </div>
          <ul className="space-y-3 flex-1 mb-8">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
                >
                  <Check size={11} strokeWidth={2.5} className="text-slate-400" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          {isSubscribed ? (
            <button
              onClick={() => requestChange('free')}
              className="w-full py-3.5 rounded-full text-sm font-bold transition-all duration-200 min-h-[44px] hover:scale-[1.01]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.4)', color: '#F87171' }}
            >
              Downgrade to Free
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
          className={['relative rounded-2xl p-8 flex flex-col transition-all duration-300', !isSubscribed ? 'c-card' : ''].join(' ')}
          style={isSubscribed
            ? {
                background: 'linear-gradient(145deg, rgba(59,130,246,0.15), rgba(29,78,216,0.06))',
                border: '1px solid rgba(59,130,246,0.5)',
                boxShadow: '0 0 60px rgba(59,130,246,0.25), 0 24px 60px rgba(0,0,0,0.4)',
              }
            : undefined}
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
            <p className="text-5xl font-extrabold text-white tracking-tight">50,000 ₮ <span className="text-base font-normal text-slate-500">/ month</span></p>
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
            <div className="flex flex-col gap-2">
              <div
                className="w-full py-3.5 text-center text-sm font-bold rounded-full inline-flex items-center justify-center gap-2"
                style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.4)', color: '#93C5FD' }}
              >
                <Sparkles size={14} strokeWidth={1.75} /> Active — Pro Plan
              </div>
              {validUntil && (
                <p className="text-center text-xs text-slate-400">
                  {days > 0
                    ? <><span className="text-white font-bold">{days}</span> day{days !== 1 ? 's' : ''} remaining · expires {new Date(validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                    : <span className="text-red-400 font-semibold">Expired</span>
                  }
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => requestChange('pro')}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 font-bold text-white rounded-full text-sm transition-all duration-200 hover:scale-[1.02] active:scale-95 min-h-[44px]"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 12px 30px rgba(59,130,246,0.4)' }}
            >
              Upgrade to Pro — $10/month <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Verify modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-sm mx-4 rounded-2xl p-8 flex flex-col gap-5"
            style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(15,23,42,0.95))', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex flex-col gap-2" >
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Verification Required</p>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              <h2>{pendingPlan === 'pro' ? 'Upgrade to Pro' : 'Downgrade to Free'}</h2></p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Subscription changes can only be made by an admin. Please contact your administrator to {pendingPlan === 'pro' ? 'upgrade your account to Pro' : 'downgrade your account to Free'}.
              </p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 rounded-full text-sm font-bold text-white transition-all hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 8px 20px rgba(59,130,246,0.3)' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
