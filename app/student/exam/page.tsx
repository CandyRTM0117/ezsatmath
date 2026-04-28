import { createClient } from '@/lib/supabase/server'
import ExamClient from './ExamClient'

export default async function ExamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: problems } = await supabase
    .from('problems')
    .select('*, choices(*)')
    .order('order_index', { ascending: true })
    .limit(40)

  return <ExamClient problems={problems ?? []} userId={user.id} />
}
