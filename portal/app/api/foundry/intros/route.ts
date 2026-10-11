import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { loadPartners, planContextFor } from '@/lib/foundry/data'
import { isOffKey, formatBudget } from '@/lib/foundry/parse'
import { briefDueAt } from '@/lib/foundry/sla'
import { notifyFoundryTeam } from '@/lib/foundry/notify'
import { isUuid, cleanText } from '@/lib/foundry/validate'
import { sendIntroRequestNotification } from '@/lib/email'
import { createVisitorIntros } from '@/lib/foundry/visitor-intros'

const MAX_PARTNERS = 6
const OPEN_STAGES = ['awaiting_verification', 'to_brief', 'briefed', 'in_contact', 'outcome']
const CALL_TIMES = ['mornings', 'afternoons', 'evenings']

/**
 * Request intros. Members (signed in): one click, no verification.
 * Website visitors (no session): name + email, then a confirm-your-email link
 * before anything is shared with a partner.
 *
 * Body: { partners: [{ id, need? }], callTime?, consent: true, searchId?, off? }
 *   visitors also send: { name, email, phone?, marketing?, q? }
 */
export async function POST(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  if (rateLimited(request, 10)) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: cors })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try { body = await request.json() } catch { body = {} }

  if (body?.consent !== true) {
    return NextResponse.json({ error: 'Please confirm we can share your details with these partners.' }, { status: 400, headers: cors })
  }
  const wanted: { id: string; need: string | null }[] = []
  for (const p of Array.isArray(body?.partners) ? body.partners : []) {
    if (isUuid(p?.id) && !wanted.some(w => w.id === p.id)) wanted.push({ id: p.id, need: cleanText(p.need, 1000) })
  }
  if (!wanted.length) return NextResponse.json({ error: 'Choose at least one partner.' }, { status: 400, headers: cors })
  if (wanted.length > MAX_PARTNERS) return NextResponse.json({ error: `Up to ${MAX_PARTNERS} partners at a time.` }, { status: 400, headers: cors })

  const callTime = CALL_TIMES.includes(body?.callTime) ? body.callTime : null
  const searchId = isUuid(body?.searchId) ? body.searchId : null
  const off = Array.isArray(body?.off) ? body.off.filter(isOffKey) : []
  const demo = access.includeDemo

  if (!access.viewer) {
    const res = await createVisitorIntros(createAdminClient(), { wanted, callTime, searchId, body, demo })
    return NextResponse.json(res.json, { status: res.status, headers: cors })
  }
  const viewer = access.viewer

  const admin = createAdminClient()
  const [partners, ctx, { data: open }, { data: me }] = await Promise.all([
    loadPartners(admin, { includeDemo: demo }),
    planContextFor(admin, viewer, off),
    admin.from('intro_requests').select('partner_id')
      .eq('requester_id', viewer.id).in('stage', OPEN_STAGES).in('partner_id', wanted.map(w => w.id)),
    admin.from('profiles').select('full_name, email').eq('id', viewer.id).single(),
  ])

  const byId = new Map(partners.map(p => [p.id, p]))
  const openIds = new Set((open ?? []).map(o => o.partner_id))
  const toCreate = wanted.filter(w => byId.has(w.id) && !openIds.has(w.id))
  const skipped = wanted
    .filter(w => !toCreate.includes(w))
    .map(w => ({ partnerId: w.id, name: byId.get(w.id)?.name ?? null, reason: openIds.has(w.id) ? 'already_open' : 'unavailable' }))

  if (!toCreate.length) {
    return NextResponse.json({ batchId: null, created: [], skipped }, { headers: cors })
  }

  const now = new Date()
  const due = briefDueAt(now)
  const context = {
    brand: ctx.brand ?? null,
    sector: ctx.sector?.label ?? null,
    area: ctx.area?.label ?? null,
    budget: ctx.budget ? formatBudget(ctx.budget) : null,
    stage: ctx.stage ?? null,
    role: viewer.role,
  }

  const { data: batch, error: batchErr } = await admin.from('intro_batches').insert({
    requester_profile_id: viewer.id,
    source: 'portal',
    search_id: searchId,
    context,
    call_time: callTime,
    consent_at: now.toISOString(),
    verified_at: now.toISOString(),
    is_demo: demo,
  }).select('id').single()
  if (batchErr || !batch) {
    console.error('[foundry/intros] batch insert failed:', batchErr?.message)
    return NextResponse.json({ error: 'Could not send your request. Please try again.' }, { status: 500, headers: cors })
  }

  const { data: rows, error: reqErr } = await admin.from('intro_requests').insert(toCreate.map(w => ({
    requester_id: viewer.id,
    partner_id: w.id,
    batch_id: batch.id,
    need: w.need,
    message: w.need,          // legacy column, still read by older admin screens
    status: 'pending',        // legacy column
    stage: 'to_brief',
    sla_due_at: due.toISOString(),
    is_demo: demo,
  }))).select('id, partner_id')
  if (reqErr || !rows) {
    console.error('[foundry/intros] request insert failed:', reqErr?.message)
    await admin.from('intro_batches').delete().eq('id', batch.id)
    return NextResponse.json({ error: 'Could not send your request. Please try again.' }, { status: 500, headers: cors })
  }

  await admin.from('intro_events').insert(rows.map(r => ({
    intro_request_id: r.id,
    kind: 'requested',
    actor_id: viewer.id,
    body: 'You requested an intro',
    visible_to_requester: true,
  })))

  const names = rows.map(r => byId.get(r.partner_id)?.name ?? 'a partner')
  const who = me?.full_name || me?.email || 'A member'
  await notifyFoundryTeam({
    event: 'intro_request',
    title: `${who} requested ${names.length === 1 ? 'an intro' : `${names.length} intros`}`,
    body: `${names.join(', ')}. Brief by ${due.toLocaleString('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', minute: '2-digit' })}.`,
    link: '/admin/intro-requests',
  }, { demo }).catch(err => console.error('[foundry/intros] notify failed:', err))

  if (!demo) {
    for (const r of rows) {
      sendIntroRequestNotification({
        requesterName: me?.full_name ?? 'Unknown member',
        requesterEmail: me?.email ?? '',
        partnerName: byId.get(r.partner_id)?.name ?? 'Unknown partner',
        message: toCreate.find(w => w.id === r.partner_id)?.need ?? null,
      }).catch(err => console.error('[foundry/intros] team email failed:', err))
    }
  }

  return NextResponse.json({
    batchId: batch.id,
    created: rows.map(r => ({ requestId: r.id, partnerId: r.partner_id, name: byId.get(r.partner_id)?.name ?? null })),
    skipped,
    briefBy: due.toISOString(),
  }, { headers: cors })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
