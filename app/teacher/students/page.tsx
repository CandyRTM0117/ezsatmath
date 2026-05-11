export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import StudentsClient from './StudentsClient'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function TeacherStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = adminSupabase()

  const { data: students } = await admin
    .from('users')
    .select('id, name, email, is_subscribed, subscription_valid_until')
    .eq('role', 'student')
    .order('name', { ascending: true })

  return <StudentsClient students={students ?? []} />
}
