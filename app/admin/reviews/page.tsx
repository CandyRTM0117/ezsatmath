export const dynamic = 'force-dynamic'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import AdminReviewsClient from './AdminReviewsClient'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminReviewsPage() {
  const admin = adminSupabase()

  const { data: reviews } = await admin
    .from('reviews')
    .select('id, rating, body, created_at, user:users(id, name, email)')
    .order('created_at', { ascending: false })

  return <AdminReviewsClient reviews={(reviews ?? []) as any[]} />
}
