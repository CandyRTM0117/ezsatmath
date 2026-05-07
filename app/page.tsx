import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LandingNav from '@/components/ui/LandingNav'

const FEATURES = [
  { icon: '📋', title: 'Timed Exams',   desc: 'Full-length SAT practice exams with a countdown timer and realistic conditions.' },
  { icon: '📈', title: 'SAT Scoring',   desc: 'Results converted to the 200–800 scale so you always know where you stand.' },
  { icon: '📝', title: 'Problem Bank',  desc: 'Hundreds of problems across Algebra, Trigonometry, Data Analytics, and Advanced Math.' },
  { icon: '🔍', title: 'Analytics',     desc: 'Track accuracy over time, spot weak areas, and review every exam answer in detail.' },
]

const FREE_FEATURES = ['Full problem bank access', 'Unlimited practice exams', 'Per-question answer breakdown', 'SAT score conversion']
const PRO_FEATURES  = ['Everything in Free', 'Full analytics dashboard', 'Detailed performance insights', 'Daily activity charts', 'Score breakdown by topic', 'Priority support']

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin') redirect('/admin/users')
    redirect('/student/dashboard')
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <LandingNav />

      {/* HERO */}
      <section className="relative">
        <div className="container stage text-center" style={{ paddingTop: '6rem', paddingBottom: '6rem' }}>
          <span className="badge badge-violet mb-6">
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent-violet)', display: 'inline-block' }} className="animate-pulse" />
            SAT Prep, Reimagined
          </span>

          <h1 style={{ marginTop: '0.5rem' }}>
            Score higher.<br />
            <span style={{
              background: 'linear-gradient(135deg, var(--accent-pearl), var(--accent-violet) 50%, var(--accent-cyan))',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Practice smarter.
            </span>
          </h1>

          <p className="text-lg mx-auto mt-6" style={{ maxWidth: '36rem' }}>
            EzSAT gives you timed practice exams, a curated problem bank, and detailed analytics — everything you need to hit your target score.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link href="/signup" className="btn btn-primary text-base" style={{ padding: '0.95rem 2rem' }}>Start for free →</Link>
            <Link href="/login"  className="btn text-base"             style={{ padding: '0.95rem 2rem' }}>Log in</Link>
          </div>

          <p className="mt-8 text-sm text-slate-500">Join students already scoring higher on the SAT</p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20" style={{ background: 'rgba(255,255,255,0.025)' }}>
        <div className="container stage">
          <div className="text-center mb-16">
            <h2>Everything you need to succeed</h2>
            <p className="text-lg mt-3" style={{ maxWidth: '32rem', marginLeft: 'auto', marginRight: 'auto' }}>
              Built for serious SAT prep — no fluff, just results.
            </p>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {FEATURES.map(f => (
              <article key={f.title} className="card cursor-default">
                <div className="text-4xl mb-4" style={{ transform: 'translateZ(40px)' }}>{f.icon}</div>
                <h3 className="card-title">{f.title}</h3>
                <p className="card-body text-sm">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20">
        <div className="container stage" style={{ maxWidth: '52rem' }}>
          <div className="text-center mb-16">
            <h2>Simple pricing</h2>
            <p className="text-lg mt-3">Start free. Upgrade when you need more.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* FREE */}
            <article className="card">
              <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">Free</p>
              <div className="text-5xl font-extrabold text-white mb-1">$0</div>
              <p className="text-sm text-slate-400 mb-8">Forever</p>
              <ul className="stack mb-8" style={{ gap: '0.7rem' }}>
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-200">
                    <span className="text-green-400 font-bold flex-shrink-0">✓</span>{f}
                  </li>
                ))}
                <li className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="flex-shrink-0">✗</span>Analytics dashboard
                </li>
              </ul>
              <Link href="/signup" className="btn w-full">Get started free</Link>
            </article>

            {/* PRO */}
            <article className="card relative" style={{
              background: 'linear-gradient(145deg, rgba(139,92,246,0.22), rgba(34,211,238,0.14) 60%)',
              borderColor: 'rgba(139,92,246,0.55)',
              boxShadow:
                '0 1px 0 rgba(255,255,255,0.3) inset, 14px 18px 40px rgba(0,0,0,0.55), 0 0 60px rgba(139,92,246,0.45)',
            }}>
              <span className="badge badge-violet absolute" style={{ top: -14, left: '50%', transform: 'translateX(-50%) translateZ(50px)' }}>
                Most popular
              </span>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--accent-pearl)' }}>Pro</p>
              <div className="text-5xl font-extrabold text-white mb-1">$10</div>
              <p className="text-sm text-slate-400 mb-8">per month</p>
              <ul className="stack mb-8" style={{ gap: '0.7rem' }}>
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-200">
                    <span className="font-bold flex-shrink-0" style={{ color: 'var(--accent-cyan)' }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn btn-primary w-full">Start with Pro →</Link>
            </article>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-10">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span className="font-extrabold text-white text-lg">
            Ez<span style={{ color: 'var(--accent-violet)' }}>SAT</span>
          </span>
          <span>SAT prep made simple · 2026</span>
        </div>
      </footer>
    </div>
  )
}
