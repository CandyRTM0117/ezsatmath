export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
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

  const isSubscribed = profile?.is_subscribed ?? false

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { data: attempts },
    { data: exams },
    { count: totalAttempts },
    { count: correctAttempts },
    { count: totalExamAnswers },
    { count: correctExamAnswers },
  ] = await Promise.all([
    supabase
      .from('problem_attempts')
      .select('is_correct, attempted_at')
      .eq('user_id', user.id)
      .gte('attempted_at', thirtyDaysAgo.toISOString())
      .order('attempted_at', { ascending: true }),
    supabase
      .from('exams')
      .select('id, part, score, total, taken_at')
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false }),
    supabase
      .from('problem_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('problem_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_correct', true),
    supabase
      .from('exam_answers')
      .select('exam_id, exams!inner(user_id)', { count: 'exact', head: true })
      .eq('exams.user_id', user.id),
    supabase
      .from('exam_answers')
      .select('exam_id, exams!inner(user_id)', { count: 'exact', head: true })
      .eq('exams.user_id', user.id)
      .eq('is_correct', true),
  ])

  return (
    <AnalyticsClient
      attempts={attempts ?? []}
      exams={exams ?? []}
      totalAttempts={totalAttempts ?? 0}
      correctAttempts={correctAttempts ?? 0}
      totalExamAnswers={totalExamAnswers ?? 0}
      correctExamAnswers={correctExamAnswers ?? 0}
      isSubscribed={isSubscribed}
    />
  )
}
