import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { checkTracker } from '@/lib/foundry/tracker'
import { loadBatchIntros } from '@/lib/foundry/visitor-track'
import { notifyFoundryTeam } from '@/lib/foundry/notify'
import { RATINGS, OPEN_STAGES, type IntroStage } from '@/lib/foundry/intro-status'
import { isUuid } from '@/lib/foundry/validate'

/** Website tracker: GET ?b=&t= to read; POST { b, t, action: 'rate'|'withdraw', requestId, rating? }. */
export async function GET(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  if (rateLimited(request, 60)) return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: cors })
  const b = request.nextUrl.searchParams.get('b') ?? ''
  const t = request.nextUrl.searchParams.get('t') ?? ''
  if (!isUuid(b) || !checkTracker(b, t)) return NextResponse.json({ error: 'This tracker link isn’t valid.' }, { status: 404, headers: cors })
  const data = await loadBatchIntros(createAdminClient(), b)
  if (!data) return NextResponse.json({ error: 'This tracker link isn’t valid.' }, { status: 404, headers: cors })
  return NextResponse.json(data, { headers: { ...cors, 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  if (rateLimited(request, 20)) return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: cors })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await request.json().catch(() => ({}))
  if (!isUuid(body?.b) || !checkTracker(body.b, String(body?.t ?? '')) || !isUuid(body?.requestId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  }
  const admin = createAdminClient()
  const { data: r } = await admin.from('intro_requests').select('id, stage, is_demo, partners(name)')
    .eq('id', body.requestId).eq('batch_id', body.b).maybeSingle()
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partner = (r as any).partners?.name ?? 'a partner'
  const iso = new Date().toISOString()

  if (body.action === 'rate') {
    const rating = RATINGS.find(([k]) => k === body.rating)
    if (!rating) return NextResponse.json({ error: 'Choose a rating.' }, { status: 400, headers: cors })
    await admin.from('intro_requests').update({ rating: rating[0], updated_at: iso }).eq('id', r.id)
    await admin.from('intro_events').insert({ intro_request_id: r.id, kind: 'rated', body: `Visitor rated it: ${rating[1]}`, visible_to_requester: false })
    if (rating[0] !== 'going_well') {
      await notifyFoundryTeam({ event: 'intro_request', title: `${partner}: ${rating[1].toLowerCase()}`, body: 'A website visitor flagged an intro.', link: '/admin/intro-requests' }, { demo: r.is_demo }).catch(() => {})
    }
    return NextResponse.json({ ok: true }, { headers: cors })
  }
  if (body.action === 'withdraw') {
    if (!OPEN_STAGES.includes(r.stage as IntroStage)) return NextResponse.json({ error: 'This intro is already closed.' }, { status: 400, headers: cors })
    await admin.from('intro_requests').update({ stage: 'withdrawn', status: 'completed', closed_at: iso, updated_at: iso }).eq('id', r.id)
    await admin.from('intro_events').insert({ intro_request_id: r.id, kind: 'withdrawn', body: 'You withdrew this intro', visible_to_requester: true })
    await notifyFoundryTeam({ event: 'intro_request', title: `Intro withdrawn: ${partner}`, body: 'A website visitor withdrew.', link: '/admin/intro-requests' }, { demo: r.is_demo }).catch(() => {})
    return NextResponse.json({ ok: true }, { headers: cors })
  }
  return NextResponse.json({ error: 'Unknown action.' }, { status: 400, headers: cors })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
