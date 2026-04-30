import { createClient } from '@/lib/supabase/server'
import TeacherMessagesClient from './TeacherMessagesClient'

export default async function TeacherMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: students },
    { data: messages },
  ] = await Promise.all([
    supabase.from('users').select('id, name, email').eq('role', 'student'),
    supabase.from('messages')
      .select('*, sender:users!messages_sender_id_fkey(id, name, email), receiver:users!messages_receiver_id_fkey(id, name, email), problem:problems(id, title, question)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true }),
  ])

  // Find students who have actually messaged this teacher
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
