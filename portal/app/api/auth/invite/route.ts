import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/auth/invite
 * Called when the user clicks "Access my portal" on the invite landing page.
 * Validates our 72-hour invite token, then generates a fresh Supabase magic link
 * (which is immediately used — its own 24h expiry is irrelevant).
 */
export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ error: 'Missing token.' }, { status: 400 })
  }

  // Validate UUID format
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: 'Invalid invite link.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('invites')
    .select('email, invite_expires_at')
    .eq('invite_token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found. Please contact your administrator.' }, { status: 404 })
  }

  if (new Date(invite.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite link has expired. Please ask your administrator to send a new one.' }, { status: 410 })
  }

  // Generate a short-lived Supabase magic link — it is used immediately on redirect
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: invite.email,
    options: { redirectTo: `${siteUrl}/auth/confirm` },
  })

  if (error) {
    console.error('[invite] generateLink error:', error.message)
    return NextResponse.json({ error: 'Could not generate sign-in link. Please try again.' }, { status: 500 })
  }

  const hashedToken = (data as { properties?: { hashed_token?: string } })?.properties?.hashed_token
  if (!hashedToken) {
    return NextResponse.json({ error: 'Could not generate sign-in link. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ token_hash: hashedToken })
}
