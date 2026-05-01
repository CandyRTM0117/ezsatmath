export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import MessagesClient from './MessagesClient'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function StudentMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = adminSupabase()

  const [
    { data: teachers },
    { data: messages },
    { data: problems },
  ] = await Promise.all([
    admin.from('users').select('id, name, email').eq('role', 'teacher'),
    supabase.from('messages')
      .select('*, sender:users!messages_sender_id_fkey(id, name, email), receiver:users!messages_receiver_id_fkey(id, name, email), problem:problems(id, title, question)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true }),
    supabase.from('problems').select('id, title, question').limit(100),
  ])

  return (
    <MessagesClient
      userId={user.id}
      teachers={teachers ?? []}
      messages={(messages ?? []) as any[]}
      problems={problems ?? []}
    />
  )
}
