import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
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
        <div className="bg-white rounded-xl border border-slate-200 p-10 max-w-md w-full">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Unlock Pro Analytics</h1>
          <p className="text-slate-500 mb-6">
            Get detailed insights into your performance, daily activity charts, and exam history with a Pro subscription.
          </p>
          <Link
            href="/student/subscription"
            className="inline-block w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors"
          >
            View Subscription Plans
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
