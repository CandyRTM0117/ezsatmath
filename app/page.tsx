import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'admin') redirect('/admin/users')
    redirect('/student/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-slate-900">EzSAT</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2">
              Log in
            </Link>
            <Link href="/signup" className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
            SAT Prep, Simplified
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-5 leading-tight">
            Score higher on the SAT.<br />
            <span className="text-blue-600">Practice smarter.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto mb-10">
            EzSAT gives you timed practice exams, a curated problem bank, and detailed analytics — everything you need to hit your target score.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">
              Start for free
            </Link>
            <Link href="/login" className="px-6 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl transition-colors text-sm">
              Log in
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="bg-slate-50 py-20">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">Everything you need to succeed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: '📋', title: 'Timed Exams', desc: 'Full-length SAT practice exams with a countdown timer and realistic conditions.' },
                { icon: '📈', title: 'SAT Scoring', desc: 'Results are converted to the 200–800 SAT scale so you always know where you stand.' },
                { icon: '📝', title: 'Problem Bank', desc: 'Hundreds of problems across Algebra, Trigonometry, Data Analytics, and Advanced Math.' },
                { icon: '🔍', title: 'Analytics', desc: 'Track accuracy over time, spot weak areas, and review every exam answer in detail.' },
              ].map(f => (
                <div key={f.title} className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Simple pricing</h2>
            <p className="text-slate-500 text-center mb-12">Start free. Upgrade when you need more.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free */}
              <div className="border border-slate-200 rounded-2xl p-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Free</p>
                <div className="text-4xl font-bold text-slate-900 mb-1">$0</div>
                <p className="text-sm text-slate-500 mb-6">Forever</p>
                <ul className="space-y-3 text-sm text-slate-600 mb-8">
                  {['Full problem bank access', 'Unlimited practice exams', 'Per-question answer breakdown', 'SAT score conversion'].map(f => (
                    <li key={f} className="flex items-center gap-2"><span className="text-green-500">✓</span>{f}</li>
                  ))}
                  <li className="flex items-center gap-2 text-slate-400"><span>✗</span>Analytics dashboard</li>
                </ul>
                <Link href="/signup" className="block text-center py-2.5 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-medium text-slate-700 transition-colors">
                  Get started free
                </Link>
              </div>
              {/* Pro */}
              <div className="border-2 border-blue-500 rounded-2xl p-8 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most popular
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">Pro</p>
                <div className="text-4xl font-bold text-slate-900 mb-1">$10</div>
                <p className="text-sm text-slate-500 mb-6">per month</p>
                <ul className="space-y-3 text-sm text-slate-600 mb-8">
                  {['Everything in Free', 'Full problem bank access', 'Unlimited practice exams', 'Per-question answer breakdown', 'SAT score conversion', 'Analytics dashboard'].map(f => (
                    <li key={f} className="flex items-center gap-2"><span className="text-green-500">✓</span>{f}</li>
                  ))}
                </ul>
                <Link href="/signup" className="block text-center py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white transition-colors">
                  Start with Pro
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-sm text-slate-400">
          <span className="font-semibold text-slate-600">EzSAT</span>
          <span>SAT prep made simple</span>
        </div>
      </footer>
    </div>
  )
}
