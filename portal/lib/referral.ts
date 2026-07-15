import type { SupabaseClient } from '@supabase/supabase-js'

/** Cookie that carries an agent's referral code through the get-matched flow. */
export const REFERRAL_COOKIE = 'ff_ref'
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/** Builds the public share link for an agent's referral code. */
export function referralLink(code: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.franchisefoundry.co.uk'
  return `${siteUrl}/get-matched?ref=${code}`
}

/** Codes: 3–30 chars, lowercase letters/digits/hyphens, no leading/trailing/double hyphen. */
export const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidReferralCode(code: string): boolean {
  return code.length >= 3 && code.length <= 30 && CODE_PATTERN.test(code)
}

/** Normalises arbitrary input toward a valid code (used for names and custom entry). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics → hyphen
    .replace(/^-+|-+$/g, '')     // trim hyphens
    .replace(/-{2,}/g, '-')      // collapse repeats
    .slice(0, 30)
}

async function isTaken(admin: SupabaseClient, code: string, exceptUserId?: string): Promise<boolean> {
  const { data } = await admin.from('profiles').select('id').eq('referral_code', code).limit(1).maybeSingle()
  if (!data) return false
  return data.id !== exceptUserId
}

/** Picks a unique code from a base (name slug), appending -2, -3… on collision. */
async function uniqueFromBase(admin: SupabaseClient, base: string, exceptUserId?: string): Promise<string> {
  const root = (base && isValidReferralCode(base)) ? base : `agent-${Math.random().toString(36).slice(2, 6)}`
  if (!(await isTaken(admin, root, exceptUserId))) return root
  for (let n = 2; n < 100; n++) {
    const candidate = `${root}-${n}`.slice(0, 30)
    if (!(await isTaken(admin, candidate, exceptUserId))) return candidate
  }
  return `${root}-${Date.now().toString(36)}`.slice(0, 30)
}

/**
 * Returns the agent's referral code, generating a readable name-based one if missing.
 */
export async function ensureReferralCode(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('referral_code, full_name')
    .eq('id', userId)
    .single()

  if (data?.referral_code) return data.referral_code

  const base = slugify(data?.full_name ?? '')
  const code = await uniqueFromBase(admin, base, userId)

  const { error } = await admin.from('profiles').update({ referral_code: code }).eq('id', userId)
  return error ? null : code
}

/**
 * Sets a custom referral code for a user. Validates format and uniqueness.
 * Returns { code } on success or { error } with a user-facing message.
 */
export async function setReferralCode(
  admin: SupabaseClient,
  userId: string,
  desired: string,
): Promise<{ code?: string; error?: string }> {
  const code = slugify(desired)
  if (!isValidReferralCode(code)) {
    return { error: 'Use 3–30 letters, numbers or hyphens.' }
  }
  if (await isTaken(admin, code, userId)) {
    return { error: 'That code is already taken. Try another.' }
  }
  const { error } = await admin.from('profiles').update({ referral_code: code }).eq('id', userId)
  if (error) return { error: 'Could not save the code.' }
  return { code }
}

/** Resolves a referral code to an introducer's user id, or null if invalid. */
export async function resolveReferral(admin: SupabaseClient, code: string | undefined | null): Promise<string | null> {
  if (!code || typeof code !== 'string') return null
  const clean = code.trim().toLowerCase()
  if (!isValidReferralCode(clean)) return null

  const { data } = await admin
    .from('profiles')
    .select('id, role')
    .eq('referral_code', clean)
    .eq('role', 'introducer')
    .single()

  return data?.id ?? null
}
