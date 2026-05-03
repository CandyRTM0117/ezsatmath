export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProblemDetailClient from './ProblemDetailClient'

export default async function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: problem } = await supabase
    .from('problems')
    .select('*, choices(*)')
    .eq('id', id)
    .single()

  if (!problem) notFound()

  const choices = (problem.choices ?? []).sort(
    (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
  )

  return <ProblemDetailClient problem={{ ...problem, choices }} />
}
