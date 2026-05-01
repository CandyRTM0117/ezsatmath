export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import AdminMessagesClient from './AdminMessagesClient'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = adminSupabase()

  const [
    { data: allUsers },
    { data: messages },
  ] = await Promise.all([
    admin.from('users').select('id, name, email').neq('id', user.id),
    admin.from('messages')
      .select('*, sender:users!messages_sender_id_fkey(id, name, email), receiver:users!messages_receiver_id_fkey(id, name, email), problem:problems(id, title, question)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true }),
  ])

  const activeUserIds = new Set((messages ?? []).map(m =>
    m.sender_id === user.id ? (m.receiver as any)?.id : (m.sender as any)?.id
  ).filter(Boolean))

  const activeUsers = (allUsers ?? []).filter(u => activeUserIds.has(u.id))

  return (
    <AdminMessagesClient
      userId={user.id}
      users={allUsers ?? []}
      activeUsers={activeUsers}
      messages={(messages ?? []) as any[]}
    />
  )
}
