import type { SupabaseClient } from '@supabase/supabase-js'

/** Cookie that carries an agent's referral code through the get-matched flow. */
export const REFERRAL_COOKIE = 'ff_ref'
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/** Builds the public share link for an agent's referral code. */
export function referralLink(code: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.franchisefoundry.co.uk'
  return `${siteUrl}/get-matched?ref=${code}`
}

function generateCode(): string {
  // 8 lowercase alphanumerics
  return Math.random().toString(36).slice(2, 10).padEnd(8, '0')
}

/**
 * Returns the agent's referral code, generating and persisting one if missing.
 * Uses the admin client so it can write to profiles.
 */
export async function ensureReferralCode(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single()

  if (data?.referral_code) return data.referral_code

  // Generate a unique code (retry on the rare collision)
  for (let i = 0; i < 5; i++) {
    const code = generateCode()
    const { error } = await admin
      .from('profiles')
      .update({ referral_code: code })
      .eq('id', userId)
    if (!error) return code
  }
  return null
}

/** Resolves a referral code to an introducer's user id, or null if invalid. */
export async function resolveReferral(admin: SupabaseClient, code: string | undefined | null): Promise<string | null> {
  if (!code || typeof code !== 'string') return null
  const clean = code.trim().toLowerCase()
  if (!/^[a-z0-9]{4,16}$/.test(clean)) return null

  const { data } = await admin
    .from('profiles')
    .select('id, role')
    .eq('referral_code', clean)
    .eq('role', 'introducer')
    .single()

  return data?.id ?? null
}
