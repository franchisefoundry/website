import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { NEEDS, type Need } from '@/lib/foundry/taxonomy'
import { isUuid, cleanText } from '@/lib/foundry/validate'
import { createMemberSourcing, createVisitorSourcing } from '@/lib/foundry/sourcing'

/**
 * "Ask us to source one". Creates a to_source intro request that admin
 * assigns a partner to. Members: straight onto the board. Visitors send
 * { name, email, consent } and confirm by email first.
 */
export async function POST(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  if (rateLimited(request, 10)) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: cors })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await request.json().catch(() => ({}))
  const need: Need | null = NEEDS.includes(body?.need) ? body.need : null
  if (!need) return NextResponse.json({ error: 'Unknown need.' }, { status: 400, headers: cors })
  const input = {
    need, area: cleanText(body?.area, 80), query: cleanText(body?.q, 300),
    searchId: isUuid(body?.searchId) ? body.searchId : null, demo: access.includeDemo,
  }
  const admin = createAdminClient()

  // Keep the funnel signal for Search insights either way.
  await admin.from('foundry_events').insert({
    session_id: request.headers.get('x-foundry-session')?.slice(0, 64) ?? request.cookies.get('ff_sid')?.value ?? null,
    profile_id: access.viewer?.id ?? null, kind: 'gap_request', search_id: input.searchId,
    meta: { need, area: input.area, query: input.query }, is_demo: access.includeDemo,
  })

  const res = access.viewer
    ? await createMemberSourcing(admin, access.viewer, input)
    : await createVisitorSourcing(admin, body, input)
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: 400, headers: cors })
  return NextResponse.json(res, { headers: cors })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
