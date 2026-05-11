import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/email-logs?year=2026&month=5
// Returns daily counts for the given month
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const start = new Date(year, month - 1, 1).toISOString()
  const end   = new Date(year, month, 1).toISOString()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('email_logs')
    .select('sent_at, type, status')
    .gte('sent_at', start)
    .lt('sent_at', end)
    .order('sent_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by day
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const day = new Date(row.sent_at).toISOString().slice(0, 10)
    counts[day] = (counts[day] ?? 0) + 1
  }

  return NextResponse.json({ counts, total: data?.length ?? 0 })
}
