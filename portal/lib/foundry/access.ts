/**
 * The Foundry on/off switch.
 *
 *   FOUNDRY_MODE            off | preview | live   (default off: nothing changes until it's set)
 *   FOUNDRY_PREVIEW_EMAILS  comma-separated accounts that can see it in preview
 *   FOUNDRY_PREVIEW_SECRET  shared secret the website sends in preview (x-foundry-preview header)
 *   FOUNDRY_ALLOWED_ORIGINS comma-separated origins allowed to call the API (defaults to the website)
 *
 * Preview shows demo data; live never does.
 */
import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/supabase/types'

export type FoundryMode = 'off' | 'preview' | 'live'

export interface FoundryViewer {
  id: string
  email: string | null
  role: Role
}

export interface FoundryAccess {
  allowed: boolean
  mode: FoundryMode
  viewer: FoundryViewer | null
  includeDemo: boolean
}

export function foundryMode(): FoundryMode {
  const m = (process.env.FOUNDRY_MODE ?? '').trim().toLowerCase()
  return m === 'preview' || m === 'live' ? m : 'off'
}

export function isPreviewEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const list = (process.env.FOUNDRY_PREVIEW_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return list.includes(email.toLowerCase())
}

function hasPreviewSecret(req: NextRequest): boolean {
  const secret = process.env.FOUNDRY_PREVIEW_SECRET
  const sent = req.headers.get('x-foundry-preview') ?? req.cookies.get('ff_preview')?.value
  if (!secret || !sent) return false
  const a = Buffer.from(sent)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** The signed-in portal user, if any. Never throws. */
export async function currentViewer(): Promise<FoundryViewer | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile) return null
    return { id: user.id, email: user.email ?? null, role: profile.role as Role }
  } catch {
    return null
  }
}

/** For API routes: may this request use The Foundry, and who is it? */
export async function foundryAccess(req: NextRequest): Promise<FoundryAccess> {
  const mode = foundryMode()
  if (mode === 'off') return { allowed: false, mode, viewer: null, includeDemo: false }
  const viewer = await currentViewer()
  if (mode === 'live') return { allowed: true, mode, viewer, includeDemo: false }
  const allowed = isPreviewEmail(viewer?.email) || hasPreviewSecret(req)
  return { allowed, mode, viewer, includeDemo: allowed }
}

/** For server components: should this signed-in user see Foundry UI? */
export async function canSeeFoundry(): Promise<boolean> {
  const mode = foundryMode()
  if (mode === 'off') return false
  if (mode === 'live') return true
  const viewer = await currentViewer()
  return isPreviewEmail(viewer?.email)
}

// ── CORS for the website front end ─────────────────────────────

const DEFAULT_ORIGINS = ['https://franchisefoundry.co.uk', 'https://www.franchisefoundry.co.uk']

function allowedOrigins(): string[] {
  const env = (process.env.FOUNDRY_ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  return env.length ? env : DEFAULT_ORIGINS
}

export function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin')
  if (!origin || !allowedOrigins().includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-foundry-preview, x-foundry-session',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}

// ── Best-effort rate limit (per serverless instance) ───────────

const hits = new Map<string, { n: number; reset: number }>()

export function rateLimited(req: NextRequest, limit = 30, windowMs = 60_000): boolean {
  const ip = req.headers.get('x-nf-client-connection-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'
  const now = Date.now()
  const h = hits.get(ip)
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + windowMs })
    if (hits.size > 5_000) hits.clear()
    return false
  }
  h.n += 1
  return h.n > limit
}
