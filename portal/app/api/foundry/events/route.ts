import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { isUuid } from '@/lib/foundry/validate'

const KINDS = ['profile_view', 'add_to_list']

/** Funnel beacons for Search insights. Fire and forget; always 204. */
export async function POST(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed || rateLimited(request, 120)) return new NextResponse(null, { status: 204, headers: cors })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try { body = await request.json() } catch { body = {} }
  if (!KINDS.includes(body?.kind) || !isUuid(body?.partnerId)) return new NextResponse(null, { status: 204, headers: cors })

  const admin = createAdminClient()
  const { error } = await admin.from('foundry_events').insert({
    session_id: request.headers.get('x-foundry-session')?.slice(0, 64) ?? request.cookies.get('ff_sid')?.value ?? null,
    profile_id: access.viewer?.id ?? null,
    kind: body.kind,
    partner_id: body.partnerId,
    search_id: isUuid(body?.searchId) ? body.searchId : null,
    is_demo: access.includeDemo,
  })
  if (error) console.error('[foundry/events] insert failed:', error.message)
  return new NextResponse(null, { status: 204, headers: cors })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
