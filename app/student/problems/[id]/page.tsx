export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProblemDetailClient from './ProblemDetailClient'

export default async function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: problem }, { data: profile }] = await Promise.all([
    supabase.from('problems').select('*, choices(*)').eq('id', id).eq('status', 'approved').single(),
    user ? supabase.from('users').select('preferred_language').eq('id', user.id).single() : Promise.resolve({ data: null }),
  ])

  if (!problem) notFound()

  const choices = (problem.choices ?? []).sort(
    (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
  )

  const preferredLanguage = (profile?.preferred_language as 'en' | 'mn') ?? 'en'

  return <ProblemDetailClient problem={{ ...problem, choices }} preferredLanguage={preferredLanguage} />
}
