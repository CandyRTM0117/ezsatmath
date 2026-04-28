import { createClient } from '@/lib/supabase/server'
import ProblemsClient from './ProblemsClient'

export default async function ProblemsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: problems } = await supabase
    .from('problems')
    .select('*, choices(*)')
    .order('order_index', { ascending: true })

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

  return <ProblemsClient problems={problems ?? []} attemptMap={Object.fromEntries(attemptMap)} userId={user.id} />
}
