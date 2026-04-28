import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const accounts = [
    { email: 'luvsaa020406@gmail.com',   password: 'gentelmen32', name: 'Luvsaa', role: 'student' },
    { email: 'luvsandamba0117@gmail.com', password: 'gentelmen32', name: 'Admin',  role: 'admin'   },
  ]

  const results = []

  for (const acc of accounts) {
    // Delete existing if any (so re-running is safe)
    const { data: existing } = await admin.auth.admin.listUsers()
    const existingUser = existing?.users?.find(u => u.email === acc.email)
    if (existingUser) {
      await admin.auth.admin.deleteUser(existingUser.id)
      await admin.from('users').delete().eq('id', existingUser.id)
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
    })

    if (error || !data?.user) {
      results.push({ email: acc.email, ok: false, error: error?.message })
      continue
    }

    await admin.from('users').upsert({
      id: data.user.id,
      email: acc.email,
      name: acc.name,
      role: acc.role,
    })

    results.push({ email: acc.email, ok: true, role: acc.role })
  }

  return NextResponse.json({ results })
}
