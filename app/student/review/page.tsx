export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ReviewClient from './ReviewClient'

export default async function StudentReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, body, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <ReviewClient userId={user.id} reviews={reviews ?? []} />
}
