import { createClient } from '@/lib/supabase/server'
import BookmarksClient from './BookmarksClient'

export default async function BookmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: bookmarkRows } = await supabase
    .from('bookmarks')
    .select('problem_id, problems(*, choices(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: attempts } = await supabase
    .from('problem_attempts')
    .select('problem_id, is_correct')
    .eq('user_id', user.id)

  const attemptMap = new Map<string, boolean>()
  for (const a of (attempts ?? [])) {
    if (!attemptMap.has(a.problem_id) || a.is_correct) {
      attemptMap.set(a.problem_id, a.is_correct)
    }
  }

  const problems = (bookmarkRows ?? [])
    .map(b => b.problems)
    .filter(Boolean)

  return (
    <BookmarksClient
      problems={problems as any[]}
      attemptMap={Object.fromEntries(attemptMap)}
      userId={user.id}
    />
  )
}
