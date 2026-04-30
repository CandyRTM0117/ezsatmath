import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin/users')
  if (profile?.role === 'teacher') redirect('/teacher/problems')

  return (
    <AppShell role="student" userName={profile?.name ?? user.email ?? ''} userId={user.id}>
      {children}
    </AppShell>
  )
}
