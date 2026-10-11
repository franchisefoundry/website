import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { loadPartners, planContextFor, type PlanChip } from '@/lib/foundry/data'
import { parseQuery } from '@/lib/foundry/parse'
import { search } from '@/lib/foundry/rank'

const CHIPS: PlanChip[] = ['brand', 'area', 'budget', 'stage', 'sector']

/**
 * Foundry Search. Public (website visitors) and members (portal session).
 * Body: { q: string, off?: PlanChip[], surface?: 'website' | 'portal' }
 * Members' plan comes from their profile, never from the request body.
 */
export async function POST(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  if (rateLimited(request)) return NextResponse.json({ error: 'Too many searches. Try again in a minute.' }, { status: 429, headers: cors })

  let body: { q?: unknown; off?: unknown; surface?: unknown }
  try { body = await request.json() } catch { body = {} }
  const q = typeof body.q === 'string' ? body.q : ''
  const off = Array.isArray(body.off) ? body.off.filter((c): c is PlanChip => CHIPS.includes(c as PlanChip)) : []
  const surface = body.surface === 'website' ? 'website' : 'portal'

  const admin = createAdminClient()
  const [partners, ctx] = await Promise.all([
    loadPartners(admin, { includeDemo: access.includeDemo }),
    planContextFor(admin, access.viewer, off),
  ])
  const parsed = parseQuery(q)
  const result = search(parsed, partners, ctx)

  // Session id: website sends its own; portal uses a first-party cookie.
  const sessionId = request.headers.get('x-foundry-session')?.slice(0, 64)
    ?? request.cookies.get('ff_sid')?.value
    ?? randomUUID()

  let searchId: string | null = null
  if (parsed.raw) {
    const { data, error } = await admin.from('search_events').insert({
      session_id: sessionId,
      profile_id: access.viewer?.id ?? null,
      role: access.viewer?.role ?? null,
      surface,
      raw_query: parsed.raw,
      parsed: { ...parsed, applied: result.applied },
      partner_ids: result.partnerIds,
      result_count: result.partnerIds.length,
      unmet_needs: result.unmetNeeds,
      parser: 'rules',
      is_demo: access.includeDemo,
    }).select('id').single()
    if (error) console.error('[foundry/search] log failed:', error.message)
    searchId = data?.id ?? null
  }

  const res = NextResponse.json({ ...result, searchId, plan: ctx }, { headers: cors })
  if (!request.cookies.get('ff_sid') && !request.headers.get('x-foundry-session')) {
    res.cookies.set('ff_sid', sessionId, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 180 })
  }
  return res
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
