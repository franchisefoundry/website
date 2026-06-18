import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordReset } from '@/lib/supabase/send-password-reset'

/**
 * POST /api/auth/forgot-password  { email }
 *
 * Sends a password reset / set-password email via Resend.
 * Always returns success (never reveals whether the email is registered).
 */
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({ email: null }))

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }

  const normalised = email.trim().toLowerCase()
  const admin = createAdminClient()

  // Look up the user's name (best-effort) and confirm they exist
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('email', normalised)
    .maybeSingle()

  // Only send if the account exists — but always return success to the client
  if (profile) {
    const error = await sendPasswordReset(normalised, profile.full_name ?? null)
    if (error) {
      console.error('[forgot-password] send failed for', normalised, '-', error)
    }
  } else {
    console.warn('[forgot-password] no account for', normalised, '(returning success anyway)')
  }

  return NextResponse.json({ success: true })
}
