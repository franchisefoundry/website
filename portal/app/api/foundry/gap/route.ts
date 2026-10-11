import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { notifyFoundryTeam } from '@/lib/foundry/notify'
import { NEEDS, NEED_LABEL, type Need } from '@/lib/foundry/taxonomy'
import { isUuid, cleanText } from '@/lib/foundry/validate'

/** "Ask us to source one": logs the gap for Search insights and tells the team. */
export async function POST(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  if (rateLimited(request, 10)) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: cors })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try { body = await request.json() } catch { body = {} }
  const need: Need | null = NEEDS.includes(body?.need) ? body.need : null
  if (!need) return NextResponse.json({ error: 'Unknown need.' }, { status: 400, headers: cors })
  const area = cleanText(body?.area, 80)
  const query = cleanText(body?.q, 300)

  const admin = createAdminClient()
  await admin.from('foundry_events').insert({
    session_id: request.cookies.get('ff_sid')?.value ?? null,
    profile_id: access.viewer?.id ?? null,
    kind: 'gap_request',
    search_id: isUuid(body?.searchId) ? body.searchId : null,
    meta: { need, area, query },
    is_demo: access.includeDemo,
  })

  let who = 'A website visitor'
  if (access.viewer) {
    const { data } = await admin.from('profiles').select('full_name, email').eq('id', access.viewer.id).single()
    who = data?.full_name || data?.email || 'A member'
  }
  await notifyFoundryTeam({
    event: 'intro_request',
    title: `Sourcing request: ${NEED_LABEL[need]}${area ? ` in ${area}` : ''}`,
    body: `${who} asked us to find a partner.${query ? ` They searched: “${query}”` : ''}`,
    link: '/admin/intro-requests',
  }, { demo: access.includeDemo }).catch(err => console.error('[foundry/gap] notify failed:', err))

  return NextResponse.json({ ok: true }, { headers: cors })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
