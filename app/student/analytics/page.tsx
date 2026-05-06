export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import AnalyticsClient from './AnalyticsClient'

export interface DomainStat {
  name: string
  correct: number
  total: number
}

export interface TodoTask {
  id: string
  task_text: string
  completed: boolean
  expires_at: string
}

function toSatScore(raw: number, total: number) {
  if (total === 0) return 200
  return Math.round(200 + (raw / total) * 600)
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('is_subscribed, subscription_start_date, subscription_valid_until')
    .eq('id', user.id)
    .single()

  let isSubscribed = profile?.is_subscribed ?? false
  const subscriptionValidUntil = profile?.subscription_valid_until ?? null

  // Auto-expire subscription if past the valid-until date
  if (isSubscribed && subscriptionValidUntil && new Date(subscriptionValidUntil) < new Date()) {
    await supabase.from('users').update({ is_subscribed: false }).eq('id', user.id)
    isSubscribed = false
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { data: attempts },
    { data: exams },
    { count: totalAttempts },
    { count: correctAttempts },
    { count: totalExamAnswers },
    { count: correctExamAnswers },
    { data: rawTodos },
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
    supabase
      .from('todo_tasks')
      .select('id, task_text, completed, expires_at')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true }),
  ])

  // Find the best completed exam pair and compute domain stats
  let domainStats: DomainStat[] | null = null
  if (exams && exams.length > 0) {
    const part1s = exams.filter(e => e.part === 1)
    let bestPair: { e1Id: string; e2Id?: string } | null = null
    let bestSat = -1

    for (const e1 of part1s) {
      const e2 = exams.find(e =>
        e.part === 2 &&
        Math.abs(new Date(e.taken_at).getTime() - new Date(e1.taken_at).getTime()) < 48 * 3600 * 1000
      )
      const totalScore = e1.score + (e2?.score ?? 0)
      const totalQ = e1.total + (e2?.total ?? 0)
      const sat = toSatScore(totalScore, totalQ)
      if (sat > bestSat) {
        bestSat = sat
        bestPair = { e1Id: e1.id, e2Id: e2?.id }
      }
    }

    if (bestPair) {
      const examIds = [bestPair.e1Id, bestPair.e2Id].filter(Boolean) as string[]
      const { data: domainAnswers } = await supabase
        .from('exam_answers')
        .select('is_correct, problem:problems(category)')
        .in('exam_id', examIds)

      if (domainAnswers) {
        const map: Record<string, { correct: number; total: number }> = {}
        for (const a of domainAnswers) {
          const cat = ((a.problem as any)?.category as string) ?? 'Other'
          if (!map[cat]) map[cat] = { correct: 0, total: 0 }
          map[cat].total++
          if (a.is_correct) map[cat].correct++
        }
        domainStats = Object.entries(map)
          .map(([name, s]) => ({ name, correct: s.correct, total: s.total }))
          .sort((a, b) => b.total - a.total)
      }
    }
  }

  const initialTodos: TodoTask[] = (rawTodos ?? []).map(t => ({
    id: t.id,
    task_text: t.task_text,
    completed: t.completed,
    expires_at: t.expires_at,
  }))

  return (
    <AnalyticsClient
      attempts={attempts ?? []}
      exams={exams ?? []}
      totalAttempts={totalAttempts ?? 0}
      correctAttempts={correctAttempts ?? 0}
      totalExamAnswers={totalExamAnswers ?? 0}
      correctExamAnswers={correctExamAnswers ?? 0}
      isSubscribed={isSubscribed}
      subscriptionValidUntil={isSubscribed ? subscriptionValidUntil : null}
      domainStats={domainStats}
      initialTodos={initialTodos}
      userId={user.id}
    />
  )
}
