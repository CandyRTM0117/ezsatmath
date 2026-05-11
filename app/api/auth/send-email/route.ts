import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { jwtVerify } from 'jose'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

// Map Supabase email_action_type → human-readable type stored in email_logs
const typeMap: Record<string, string> = {
  signup:        'confirmation',
  recovery:      'password_reset',
  magiclink:     'magic_link',
  email_change:  'email_change',
  invite:        'invite',
}

// Supabase sends a HS256-signed JWT in the Authorization header.
// The env var is in "v1,whsec_<base64>" format — we decode the base64 bytes as the secret.
async function verifyHookJwt(authHeader: string | null): Promise<boolean> {
  const rawSecret = process.env.SEND_EMAIL_HOOK_SECRET
  if (!rawSecret) return true // no secret configured → skip verification

  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice(7)

  try {
    // Strip the "v1,whsec_" prefix if present to get the raw base64 secret
    const b64 = rawSecret.includes('whsec_')
      ? rawSecret.split('whsec_')[1]
      : rawSecret
    const secretBytes = Buffer.from(b64, 'base64')
    await jwtVerify(token, secretBytes)
    return true
  } catch {
    return false
  }
}

// Supabase "Send Email" Auth Hook
// Docs: https://supabase.com/docs/guides/auth/auth-hooks#send-email-hook
export async function POST(req: NextRequest) {
  const authorized = await verifyHookJwt(req.headers.get('authorization'))
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { user, email_data } = body

  const email: string = user?.email ?? ''
  const actionType: string = email_data?.email_action_type ?? 'unknown'
  const emailType = typeMap[actionType] ?? actionType
  const token: string = email_data?.token ?? ''
  const tokenHash: string = email_data?.token_hash ?? ''
  const redirectTo: string = email_data?.redirect_to ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const siteUrl: string = email_data?.site_url ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

  // Build the confirmation/reset link
  const confirmUrl = `${siteUrl}/auth/confirm?token_hash=${tokenHash}&type=${actionType}&next=${encodeURIComponent(redirectTo)}`

  let subject = 'EzSAT — Confirm your email'
  let html = `<p>Click <a href="${confirmUrl}">here</a> to confirm your email.</p>`

  if (emailType === 'password_reset') {
    subject = 'EzSAT — Reset your password'
    html = `<p>Click <a href="${confirmUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`
  } else if (emailType === 'magic_link') {
    subject = 'EzSAT — Your magic link'
    html = `<p>Click <a href="${confirmUrl}">here</a> to sign in. This link expires in 1 hour.</p>`
  } else if (emailType === 'invite') {
    subject = "EzSAT — You've been invited"
    html = `<p>You've been invited to EzSAT. Click <a href="${confirmUrl}">here</a> to accept.</p>`
  } else if (emailType === 'email_change') {
    subject = 'EzSAT — Confirm your new email'
    html = `<p>Click <a href="${confirmUrl}">here</a> to confirm your new email address.</p>`
  }

  let status = 'sent'
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@ezsat.mn',
      to: email,
      subject,
      html,
    })
  } catch {
    status = 'failed'
  }

  // Log to email_logs regardless of send result
  const supabase = createAdminClient()
  await supabase.from('email_logs').insert({ email, type: emailType, status })

  return NextResponse.json({})
}
