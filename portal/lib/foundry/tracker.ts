/**
 * No-login access for website visitors.
 *
 * Tracker link: /foundry/track.html?b=<batchId>&t=<HMAC(batchId)>. Stateless,
 * so every update email can carry it. Verify link: one-time random token,
 * stored hashed on the batch.
 *
 *   FOUNDRY_TRACKER_SECRET  signs tracker links (required for website intros)
 *   FOUNDRY_WEBSITE_URL     defaults to https://franchisefoundry.co.uk
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export function websiteUrl(): string {
  return (process.env.FOUNDRY_WEBSITE_URL ?? 'https://franchisefoundry.co.uk').replace(/\/$/, '')
}

function secret(): string {
  const s = process.env.FOUNDRY_TRACKER_SECRET
  if (!s) throw new Error('FOUNDRY_TRACKER_SECRET is not set')
  return s
}

export function trackerToken(batchId: string): string {
  return createHmac('sha256', secret()).update(`tracker:${batchId}`).digest('base64url').slice(0, 32)
}

export function checkTracker(batchId: string, token: string): boolean {
  if (!batchId || !token) return false
  let expected: string
  try { expected = trackerToken(batchId) } catch { return false }
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function trackerUrl(batchId: string): string {
  return `${websiteUrl()}/foundry/track.html?b=${batchId}&t=${trackerToken(batchId)}`
}

export function newVerifyToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url')
  return { token, hash: hashToken(token) }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function verifyUrl(batchId: string, token: string): string {
  return `${websiteUrl()}/foundry/verify.html?b=${batchId}&v=${token}`
}
