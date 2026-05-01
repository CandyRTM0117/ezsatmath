export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ExamClient from './ExamClient'

export default async function ExamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: profile },
    { data: easyProblems },
    { data: mediumProblems },
    { data: hardProblems },
    { count: examCount },
    { data: examHistory },
  ] = await Promise.all([
    supabase.from('users').select('is_subscribed').eq('id', user.id).single(),
    supabase.from('problems').select('*, choices(*)').eq('difficulty', 'easy'),
    supabase.from('problems').select('*, choices(*)').eq('difficulty', 'medium'),
    supabase.from('problems').select('*, choices(*)').eq('difficulty', 'hard'),
    // Count Part 1 exams = number of completed exam sessions
    supabase.from('exams').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('part', 1),
    supabase.from('exams').select('id, part, score, total, taken_at').eq('user_id', user.id).order('taken_at', { ascending: false }).limit(20),
  ])

  return (
    <ExamClient
      easyProblems={easyProblems ?? []}
      mediumProblems={mediumProblems ?? []}
      hardProblems={hardProblems ?? []}
      userId={user.id}
      isSubscribed={profile?.is_subscribed ?? false}
      examCount={examCount ?? 0}
      examHistory={examHistory ?? []}
    />
  )
}
