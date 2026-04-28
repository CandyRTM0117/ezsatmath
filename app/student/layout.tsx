import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/ui/Sidebar'

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

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar role="student" userName={profile?.name ?? user.email ?? ''} />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-10">{children}</main>
    </div>
  )
}
