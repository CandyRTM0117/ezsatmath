export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ProblemsClient from './ProblemsClient'

export default async function ProblemsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: attempts },
    { data: bookmarkRows },
    { data: profile },
  ] = await Promise.all([
    supabase.from('problem_attempts').select('problem_id, is_correct').eq('user_id', user.id),
    supabase.from('bookmarks').select('problem_id').eq('user_id', user.id),
    supabase.from('users').select('*').eq('id', user.id).single(),
  ])

  const isSubscribed = profile?.is_subscribed ?? false

  const problemsQuery = supabase.from('problems').select('*, choices(*)')
  const { data: problems } = isSubscribed
    ? await problemsQuery.order('order_index', { ascending: true })
    : await problemsQuery.eq('is_free_problem', true).order('order_index', { ascending: true })

  const attemptMap = new Map<string, boolean>()
  for (const a of (attempts ?? [])) {
    if (!attemptMap.has(a.problem_id) || a.is_correct) {
      attemptMap.set(a.problem_id, a.is_correct)
    }
  }

  const initialBookmarks = new Set((bookmarkRows ?? []).map(b => b.problem_id))

  return (
    <ProblemsClient
      problems={problems ?? []}
      attemptMap={Object.fromEntries(attemptMap)}
      userId={user.id}
      initialBookmarks={initialBookmarks}
      userData={{ ...user, ...profile }}
      isSubscribed={isSubscribed}
    />
  )
}
