import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { hashToken, trackerToken } from '@/lib/foundry/tracker'
import { briefDueAt } from '@/lib/foundry/sla'
import { notifyFoundryTeam } from '@/lib/foundry/notify'
import { isUuid } from '@/lib/foundry/validate'

/**
 * Confirm-your-email link target. Moves the batch's requests into the
 * pipeline, links them to a portal account if the email has one, and tells
 * the team. Returns the tracker token. Safe to call twice.
 */
export async function POST(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  if (rateLimited(request, 20)) return NextResponse.json({ error: 'Too many attempts.' }, { status: 429, headers: cors })
  const b = await request.json().catch(() => ({}))
  const batchId = b?.b, token = typeof b?.v === 'string' ? b.v : ''
  const bad = NextResponse.json({ error: 'This link has expired or already been used. Request again, or use “Email me my link”.' }, { status: 400, headers: cors })
  if (!isUuid(batchId) || !token) return bad

  const admin = createAdminClient()
  const { data: batch } = await admin.from('intro_batches')
    .select('id, verified_at, verify_token_hash, is_demo, contact_id, foundry_contacts(id, email, name)')
    .eq('id', batchId).maybeSingle()
  if (!batch) return bad
  if (batch.verified_at) return NextResponse.json({ ok: true, b: batch.id, t: trackerToken(batch.id) }, { headers: cors })
  const expected = Buffer.from(batch.verify_token_hash ?? '')
  const sent = Buffer.from(hashToken(token))
  if (!expected.length || expected.length !== sent.length || !timingSafeEqual(expected, sent)) return bad

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contact = (batch as any).foundry_contacts as { id: string; email: string; name: string | null } | null
  const now = new Date()
  const iso = now.toISOString()

  // Portal profile wins: same email → these intros also show in their My intros.
  let profileId: string | null = null
  if (contact?.email) {
    const { data: prof } = await admin.from('profiles').select('id').eq('email', contact.email.toLowerCase()).maybeSingle()
    profileId = prof?.id ?? null
  }
  if (contact) await admin.from('foundry_contacts').update({ verified_at: iso, ...(profileId ? { profile_id: profileId } : {}) }).eq('id', contact.id)
  await admin.from('intro_batches').update({ verified_at: iso, verify_token_hash: null }).eq('id', batch.id)

  const owner = profileId ? { requester_id: profileId } : {}
  // Sourcing requests (no partner yet) go to "To source"; the rest to "To brief".
  const { data: sourcing } = await admin.from('intro_requests')
    .update({ stage: 'to_source', updated_at: iso, ...owner })
    .eq('batch_id', batch.id).eq('stage', 'awaiting_verification').is('partner_id', null)
    .select('id')
  const { data: reqs } = await admin.from('intro_requests')
    .update({ stage: 'to_brief', sla_due_at: briefDueAt(now).toISOString(), updated_at: iso, ...owner })
    .eq('batch_id', batch.id).eq('stage', 'awaiting_verification')
    .select('id, partners(name)')
  if (sourcing?.length) {
    await admin.from('intro_events').insert(sourcing.map(r => ({ intro_request_id: r.id, kind: 'verified', body: 'You confirmed your email. We’re finding you a partner.', visible_to_requester: true })))
    await notifyFoundryTeam({
      event: 'intro_request', title: `To source (website): ${contact?.name ?? 'a visitor'}`,
      body: 'A website visitor asked us to find a partner. Assign one from Requests.', link: '/admin/intro-requests',
    }, { demo: batch.is_demo }).catch(e => console.error('[foundry/verify] notify failed', e))
  }
  if (reqs?.length) {
    await admin.from('intro_events').insert(reqs.map(r => ({ intro_request_id: r.id, kind: 'verified', body: 'You confirmed your email. We’re briefing them now.', visible_to_requester: true })))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const names = reqs.map(r => (r as any).partners?.name ?? 'a partner')
    await notifyFoundryTeam({
      event: 'intro_request',
      title: `${contact?.name ?? 'A website visitor'} requested ${names.length === 1 ? 'an intro' : `${names.length} intros`} (website)`,
      body: `${names.join(', ')}. Brief within 4 working hours.`,
      link: '/admin/intro-requests',
    }, { demo: batch.is_demo }).catch(e => console.error('[foundry/verify] notify failed', e))
  }
  return NextResponse.json({ ok: true, b: batch.id, t: trackerToken(batch.id) }, { headers: cors })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
