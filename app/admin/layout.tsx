import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/ui/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/student/dashboard')

  return (
    <div className="flex">
      <Sidebar role="admin" userName={profile?.name ?? user.email ?? ''} />
      <main className="flex-1 min-h-screen bg-slate-50 p-8">{children}</main>
    </div>
  )
}
