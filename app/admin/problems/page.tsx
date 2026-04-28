import { createClient } from '@/lib/supabase/server'
import ProblemsClient from './ProblemsClient'

export default async function ProblemsPage() {
  const supabase = await createClient()
  const { data: problems } = await supabase
    .from('problems')
    .select('*, choices(*)')
    .order('order_index', { ascending: true })

  return <ProblemsClient initialProblems={problems ?? []} />
}
