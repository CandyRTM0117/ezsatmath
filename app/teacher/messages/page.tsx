export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import TeacherMessagesClient from './TeacherMessagesClient'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function TeacherMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = adminSupabase()

  const [
    { data: students },
    { data: messages },
  ] = await Promise.all([
    admin.from('users').select('id, name, email').eq('role', 'student'),
    supabase.from('messages')
      .select('*, sender:users!messages_sender_id_fkey(id, name, email), receiver:users!messages_receiver_id_fkey(id, name, email), problem:problems(id, title, question)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true }),
  ])

  const activeStudentIds = new Set((messages ?? []).map(m =>
    m.sender_id === user.id ? (m.receiver as any)?.id : (m.sender as any)?.id
  ).filter(Boolean))

  const activeStudents = (students ?? []).filter(s => activeStudentIds.has(s.id))
  const allStudents = students ?? []

  return (
    <TeacherMessagesClient
      userId={user.id}
      students={allStudents}
      activeStudents={activeStudents}
      messages={(messages ?? []) as any[]}
    />
  )
}
