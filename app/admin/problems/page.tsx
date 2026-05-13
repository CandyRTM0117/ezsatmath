export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ProblemsClient from './ProblemsClient'
import type { Problem } from '@/types'

async function fetchAllProblems(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Problem[]> {
  const PAGE = 1000
  let from = 0
  const all: Problem[] = []
  while (true) {
    const { data } = await supabase
      .from('problems')
      .select('*')
      .order('order_index', { ascending: true })
      .range(from, from + PAGE - 1)
    if (!data?.length) break
    all.push(...(data as Problem[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

export default async function ProblemsPage() {
  const supabase = await createClient()
  const problems = await fetchAllProblems(supabase)
  return <ProblemsClient initialProblems={problems} />
}
