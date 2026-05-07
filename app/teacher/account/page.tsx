export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ChangePasswordForm from '@/app/student/dashboard/ChangePasswordForm'

export default async function TeacherAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('name, email, created_at, role')
    .eq('id', user.id)
    .single()

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          Account
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Manage your profile and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Account Info */}
        <div className="c-card rounded-2xl p-7">
          <h2 className="font-extrabold text-white text-lg mb-6 tracking-tight">Account Info</h2>
          <div className="space-y-4">
            {[
              { label: 'Name',   value: profile?.name ?? '—' },
              { label: 'Email',  value: profile?.email ?? user.email ?? '—' },
              { label: 'Role',   value: 'Teacher' },
              { label: 'Joined', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—' },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest w-16 shrink-0">{row.label}</span>
                <span className="text-sm font-medium text-slate-200 truncate">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Change Password */}
        <ChangePasswordForm email={profile?.email ?? user.email ?? ''} />
      </div>
    </div>
  )
}
