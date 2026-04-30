import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Lock, ArrowRight } from 'lucide-react'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('is_subscribed')
    .eq('id', user.id)
    .single()

  if (!profile?.is_subscribed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div
          className="rounded-2xl border border-white/10 p-10 max-w-md w-full"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 0 60px rgba(59,130,246,0.08)',
          }}
        >
          <div
            className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}
          >
            <Lock size={28} strokeWidth={1.5} className="text-blue-300" />
          </div>
          <h1 className="text-3xl font-extrabold mb-3 tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
            Unlock Pro Analytics
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-7">
            Get detailed insights into your performance, daily activity charts, and exam history with a Pro subscription.
          </p>
          <Link
            href="/student/subscription"
            prefetch={true}
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 font-bold text-white rounded-full text-sm transition-all duration-200 hover:scale-[1.02] active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 12px 30px rgba(59,130,246,0.4)' }}
          >
            View Subscription Plans <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    )
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: attempts } = await supabase
    .from('problem_attempts')
    .select('is_correct, attempted_at')
    .eq('user_id', user.id)
    .gte('attempted_at', thirtyDaysAgo.toISOString())
    .order('attempted_at', { ascending: true })

  const { data: exams } = await supabase
    .from('exams')
    .select('part, score, total, taken_at')
    .eq('user_id', user.id)
    .order('taken_at', { ascending: true })

  const { count: totalAttempts } = await supabase
    .from('problem_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: correctAttempts } = await supabase
    .from('problem_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_correct', true)

  const { count: totalExamAnswers } = await supabase
    .from('exam_answers')
    .select('exam_id, exams!inner(user_id)', { count: 'exact', head: true })
    .eq('exams.user_id', user.id)

  const { count: correctExamAnswers } = await supabase
    .from('exam_answers')
    .select('exam_id, exams!inner(user_id)', { count: 'exact', head: true })
    .eq('exams.user_id', user.id)
    .eq('is_correct', true)

  return (
    <AnalyticsClient
      attempts={attempts ?? []}
      exams={exams ?? []}
      totalAttempts={totalAttempts ?? 0}
      correctAttempts={correctAttempts ?? 0}
      totalExamAnswers={totalExamAnswers ?? 0}
      correctExamAnswers={correctExamAnswers ?? 0}
    />
  )
}
