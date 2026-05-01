export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import TeacherProblemsClient from './TeacherProblemsClient'

export default async function TeacherProblemsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: problems },
    { data: attempts },
  ] = await Promise.all([
    supabase.from('problems').select('*, choices(*)').order('order_index', { ascending: true }),
    supabase.from('problem_attempts').select('problem_id, is_correct').eq('user_id', user.id),
  ])

  const attemptMap = new Map<string, boolean>()
  for (const a of (attempts ?? [])) {
    if (!attemptMap.has(a.problem_id) || a.is_correct) {
      attemptMap.set(a.problem_id, a.is_correct)
    }
  }

  return (
    <TeacherProblemsClient
      problems={problems ?? []}
      attemptMap={Object.fromEntries(attemptMap)}
      userId={user.id}
    />
  )
}
