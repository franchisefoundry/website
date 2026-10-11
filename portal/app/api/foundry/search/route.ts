import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { loadPartners, planContextFor } from '@/lib/foundry/data'
import { parseQuery, dropFromQuery, isOffKey } from '@/lib/foundry/parse'
import { search } from '@/lib/foundry/rank'

/**
 * Foundry Search. Public (website visitors) and members (portal session).
 * Body: { q: string, off?: OffKey[], surface?: 'website' | 'portal', log?: boolean }
 * Members' plan comes from their profile, never from the request body.
 * `log: false` is for the live preview under the search bar (no search_events row).
 */
export async function POST(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })

  let body: { q?: unknown; off?: unknown; surface?: unknown; log?: unknown }
  try { body = await request.json() } catch { body = {} }
  const log = body.log !== false
  if (rateLimited(request, log ? 30 : 120)) {
    return NextResponse.json({ error: 'Too many searches. Try again in a minute.' }, { status: 429, headers: cors })
  }
  const q = typeof body.q === 'string' ? body.q : ''
  const off = Array.isArray(body.off) ? body.off.filter(isOffKey) : []
  const surface = body.surface === 'website' ? 'website' : 'portal'

  const admin = createAdminClient()
  const [partners, ctx] = await Promise.all([
    loadPartners(admin, { includeDemo: access.includeDemo }),
    planContextFor(admin, access.viewer, off),
  ])
  const parsed = dropFromQuery(parseQuery(q), off)
  const result = search(parsed, partners, ctx)

  // Session id: website sends its own; portal uses a first-party cookie.
  const sessionId = request.headers.get('x-foundry-session')?.slice(0, 64)
    ?? request.cookies.get('ff_sid')?.value
    ?? randomUUID()

  let searchId: string | null = null
  if (log && parsed.raw) {
    const { data, error } = await admin.from('search_events').insert({
      session_id: sessionId,
      profile_id: access.viewer?.id ?? null,
      role: access.viewer?.role ?? null,
      surface,
      raw_query: parsed.raw,
      parsed: { ...parsed, applied: result.applied, off },
      partner_ids: result.partnerIds,
      result_count: result.partnerIds.length,
      unmet_needs: result.unmetNeeds,
      parser: 'rules',
      is_demo: access.includeDemo,
    }).select('id').single()
    if (error) console.error('[foundry/search] log failed:', error.message)
    searchId = data?.id ?? null
  }

  const res = NextResponse.json({ ...result, searchId, plan: ctx, off }, { headers: cors })
  if (!request.cookies.get('ff_sid') && !request.headers.get('x-foundry-session')) {
    res.cookies.set('ff_sid', sessionId, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 180 })
  }
  return res
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
