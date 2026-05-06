import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function assertAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

// PATCH /api/admin/subscription
// body: { userId, action: 'upgrade' | 'downgrade' | 'extend' }
export async function PATCH(req: Request) {
  const caller = await assertAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, action } = await req.json()
  if (!userId || !['upgrade', 'downgrade', 'extend'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const admin = adminSupabase()
  const now = new Date()

  if (action === 'downgrade') {
    const { error } = await admin.from('users').update({
      is_subscribed: false,
      subscription_start_date: null,
      subscription_valid_until: null,
    }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'upgrade') {
    const validUntil = new Date(now)
    validUntil.setDate(validUntil.getDate() + 30)
    const { error } = await admin.from('users').update({
      is_subscribed: true,
      subscription_start_date: now.toISOString(),
      subscription_valid_until: validUntil.toISOString(),
    }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'extend') {
    const { data: user } = await admin.from('users').select('subscription_valid_until').eq('id', userId).single()
    const base = user?.subscription_valid_until ? new Date(user.subscription_valid_until) : now
    if (base < now) base.setTime(now.getTime())
    base.setDate(base.getDate() + 30)
    const { error } = await admin.from('users').update({
      is_subscribed: true,
      subscription_valid_until: base.toISOString(),
    }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
