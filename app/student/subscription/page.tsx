export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import SubscriptionClient from './SubscriptionClient'

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('is_subscribed')
    .eq('id', user.id)
    .single()

  return (
    <SubscriptionClient
      isSubscribed={profile?.is_subscribed ?? false}
    />
  )
}
