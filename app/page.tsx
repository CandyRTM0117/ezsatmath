import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LandingNav from '@/components/ui/LandingNav'

const FEATURES = [
  { icon: '📋', title: 'Timed Exams', desc: 'Full-length SAT practice exams with a countdown timer and realistic conditions.' },
  { icon: '📈', title: 'SAT Scoring', desc: 'Results converted to the 200–800 scale so you always know where you stand.' },
  { icon: '📝', title: 'Problem Bank', desc: 'Hundreds of problems across Algebra, Trigonometry, Data Analytics, and Advanced Math.' },
  { icon: '🔍', title: 'Analytics', desc: 'Track accuracy over time, spot weak areas, and review every exam answer in detail.' },
]

const FREE_FEATURES = ['Full problem bank access', 'Unlimited practice exams', 'Per-question answer breakdown', 'SAT score conversion']
const PRO_FEATURES = ['Everything in Free', 'Full analytics dashboard', 'Detailed performance insights', 'Daily activity charts', 'Score breakdown by topic', 'Priority support']

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin') redirect('/admin/users')
    redirect('/student/dashboard')
  }

  return (
    <div className="min-h-screen text-slate-50 overflow-x-hidden" style={{ background: '#0F172A' }}>
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #3B82F6 0%, transparent 70%)', filter: 'blur(60px)' }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold px-4 py-1.5 rounded-full mb-8 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            SAT Prep, Reimagined
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
            Score higher.<br />
            <span style={{ background: 'linear-gradient(135deg, #60A5FA, #3B82F6, #6366F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Practice smarter.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            EzSAT gives you timed practice exams, a curated problem bank, and detailed analytics — everything you need to hit your target score.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 text-white font-bold rounded-full text-base transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 0 30px rgba(59,130,246,0.4)' }}
            >
              Start for free →
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 font-semibold rounded-full text-base transition-all hover:bg-white/15 border border-white/20 text-white"
              style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
            >
              Log in
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-sm text-slate-500">Join students already scoring higher on the SAT</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-24" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Everything you need to succeed
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Built for serious SAT prep — no fluff, just results.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-2xl p-6 border transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/40 cursor-default"
                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.12)' }}
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-extrabold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Simple pricing</h2>
            <p className="text-slate-400 text-lg">Start free. Upgrade when you need more.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="rounded-2xl p-8 border" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Free</p>
              <div className="text-5xl font-extrabold text-white mb-1">$0</div>
              <p className="text-sm text-slate-400 mb-8">Forever</p>
              <ul className="space-y-3 mb-8">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="text-green-400 font-bold flex-shrink-0">✓</span>{f}
                  </li>
                ))}
                <li className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="flex-shrink-0">✗</span>Analytics dashboard
                </li>
              </ul>
              <Link
                href="/signup"
                className="block text-center py-3 font-semibold rounded-full text-sm text-white transition-all hover:bg-white/20 border border-white/20"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div
              className="rounded-2xl p-8 relative"
              style={{
                background: 'linear-gradient(145deg, rgba(59,130,246,0.15), rgba(29,78,216,0.1))',
                border: '2px solid #3B82F6',
                boxShadow: '0 0 40px rgba(59,130,246,0.25), 0 20px 40px rgba(0,0,0,0.3)',
              }}
            >
              <div
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
              >
                Most popular
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Pro</p>
              <div className="text-5xl font-extrabold text-white mb-1">$10</div>
              <p className="text-sm text-slate-400 mb-8">per month</p>
              <ul className="space-y-3 mb-8">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-200">
                    <span className="text-blue-400 font-bold flex-shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center py-3 font-bold rounded-full text-sm text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 0 20px rgba(59,130,246,0.4)' }}
              >
                Start with Pro →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span className="font-extrabold text-white text-lg">Ez<span className="text-blue-400">SAT</span></span>
          <span>SAT prep made simple · 2026</span>
        </div>
      </footer>
    </div>
  )
}
