/**
 * "Ask us to source one": a real intro request with no partner yet
 * (stage to_source) that admin assigns from the pipeline. Members go
 * straight onto the board; website visitors confirm their email first.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { NEED_LABEL, type Need } from './taxonomy.ts'
import { parseQuery, formatBudget } from './parse.ts'
import { newVerifyToken, verifyUrl, trackerToken } from './tracker'
import { sendVerifyEmail } from './visitor-email'
import { notifyFoundryTeam } from './notify'
import { cleanText, isUuid } from './validate'
import type { FoundryViewer } from './access'

interface SourcingInput { need: Need; area: string | null; query: string | null; searchId: string | null; demo: boolean }

function needText(i: SourcingInput) {
  return `Find a ${NEED_LABEL[i.need].toLowerCase()} partner${i.area ? ` in ${i.area}` : ''}.${i.query ? ` They searched: “${i.query}”` : ''}`
}

function contextFrom(q: string | null, role: string) {
  const p = parseQuery(q ?? '')
  return { sector: p.sector?.label ?? null, area: p.area?.label ?? null, budget: p.budget ? formatBudget(p.budget) : null, stage: p.stage ?? null, role }
}

export async function createMemberSourcing(admin: SupabaseClient, viewer: FoundryViewer, i: SourcingInput) {
  const now = new Date().toISOString()
  const { data: batch, error } = await admin.from('intro_batches').insert({
    requester_profile_id: viewer.id, source: 'portal', search_id: isUuid(i.searchId) ? i.searchId : null,
    context: contextFrom(i.query, viewer.role), consent_at: now, verified_at: now, is_demo: i.demo,
  }).select('id').single()
  if (error || !batch) return { error: 'Could not send that. Try again.' }
  const { data: r } = await admin.from('intro_requests').insert({
    requester_id: viewer.id, partner_id: null, batch_id: batch.id, need: needText(i), message: needText(i),
    status: 'pending', stage: 'to_source', source_category: i.need, source_area: i.area, is_demo: i.demo,
  }).select('id').single()
  if (r) await admin.from('intro_events').insert({ intro_request_id: r.id, kind: 'source_requested', actor_id: viewer.id, body: 'You asked us to find a partner', visible_to_requester: true })
  const { data: me } = await admin.from('profiles').select('full_name, email').eq('id', viewer.id).single()
  await notifyFoundryTeam({
    event: 'intro_request',
    title: `To source: ${NEED_LABEL[i.need]}${i.area ? ` in ${i.area}` : ''}`,
    body: `${me?.full_name || me?.email || 'A member'} asked us to find a partner. Assign one from Requests.`,
    link: '/admin/intro-requests',
  }, { demo: i.demo }).catch(e => console.error('[sourcing] notify failed', e))
  return { ok: true as const }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createVisitorSourcing(admin: SupabaseClient, body: any, i: SourcingInput) {
  const name = cleanText(body?.name, 120)
  const email = cleanText(body?.email, 200)?.toLowerCase() ?? null
  if (!name) return { error: 'Please add your name.' }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email address.' }
  if (body?.consent !== true) return { error: 'Please confirm we can contact you about this.' }
  try { trackerToken('check') } catch { return { error: 'This isn’t switched on yet.' } }

  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { data: existing } = await admin.from('foundry_contacts').select('id').eq('email', email).maybeSingle()
  if (existing) {
    const { count } = await admin.from('intro_batches').select('id', { count: 'exact', head: true })
      .eq('contact_id', existing.id).is('verified_at', null).gte('created_at', since)
    if ((count ?? 0) >= 3) return { error: 'We’ve already sent a few confirmation emails to that address. Check your inbox (and spam).' }
  }
  let contactId = existing?.id as string | undefined
  if (!contactId) {
    const { data: c } = await admin.from('foundry_contacts').insert({ email, name, phone: cleanText(body?.phone, 40), is_demo: i.demo }).select('id').single()
    contactId = c?.id
  }
  if (!contactId) return { error: 'Could not send that. Try again.' }
  const verify = newVerifyToken()
  const { data: batch } = await admin.from('intro_batches').insert({
    contact_id: contactId, source: 'website', search_id: isUuid(i.searchId) ? i.searchId : null,
    context: contextFrom(i.query, 'visitor'), consent_at: new Date().toISOString(), verify_token_hash: verify.hash, is_demo: i.demo,
  }).select('id').single()
  if (!batch) return { error: 'Could not send that. Try again.' }
  const { data: r } = await admin.from('intro_requests').insert({
    partner_id: null, batch_id: batch.id, need: needText(i), message: needText(i),
    status: 'pending', stage: 'awaiting_verification', source_category: i.need, source_area: i.area, is_demo: i.demo,
  }).select('id').single()
  if (r) await admin.from('intro_events').insert({ intro_request_id: r.id, kind: 'source_requested', body: 'You asked us to find a partner', visible_to_requester: true })
  await sendVerifyEmail(email, name, [`A ${NEED_LABEL[i.need].toLowerCase()} partner${i.area ? ` in ${i.area}` : ''} (we’ll find one)`], verifyUrl(batch.id, verify.token))
  return { ok: true as const, verify: true, email }
}
