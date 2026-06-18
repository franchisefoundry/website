import type { SupabaseClient } from '@supabase/supabase-js'

const INVITE_TTL_MS = 72 * 60 * 60 * 1000 // 72 hours

interface IssueInviteArgs {
  email: string
  role: 'franchisee' | 'franchisor' | 'introducer' | 'admin'
  fullName?: string | null
  invitedBy?: string | null
}

/**
 * Inserts an invite row with a fresh 72-hour token and returns the token.
 *
 * This is the single source of truth for invite tokens. The token is consumed
 * at /auth/invite, which generates a short-lived Supabase magic link on demand
 * (no PKCE, no 24h OTP cap, no reliance on Supabase's built-in email).
 *
 * Callers are responsible for having already created the Supabase auth user
 * (via admin.auth.admin.createUser) so the on-demand magic link can be generated.
 */
export async function issueInvite(
  admin: SupabaseClient,
  { email, role, fullName, invitedBy }: IssueInviteArgs,
): Promise<{ token: string | null; error: string | null }> {
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString()

  const { data, error } = await admin
    .from('invites')
    .insert({
      email: email.trim().toLowerCase(),
      role,
      full_name: fullName ?? null,
      invited_by: invitedBy ?? null,
      invite_expires_at: expiresAt,
    })
    .select('invite_token')
    .single()

  if (error || !data?.invite_token) {
    return { token: null, error: error?.message ?? 'Could not create invite record.' }
  }

  return { token: data.invite_token, error: null }
}

/** Builds the public invite landing URL for a token. */
export function inviteUrl(token: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.franchisefoundry.co.uk'
  return `${siteUrl}/auth/invite?token=${token}`
}
