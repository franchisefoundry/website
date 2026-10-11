/**
 * Website visitors requesting intros: no account. We store a contact,
 * create the batch + requests in `awaiting_verification`, and email a
 * one-time confirm link. Nothing is shared with partners until confirmed.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseQuery, formatBudget } from './parse.ts'
import { loadPartners } from './data'
import { newVerifyToken, verifyUrl, trackerToken } from './tracker'
import { sendVerifyEmail } from './visitor-email'
import { cleanText, isUuid } from './validate'

const MAX_PENDING_PER_EMAIL = 3

export interface VisitorIntroInput {
  wanted: { id: string; need: string | null }[]
  callTime: string | null
  searchId: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
  demo: boolean
}

export async function createVisitorIntros(admin: SupabaseClient, input: VisitorIntroInput):
  Promise<{ status: number; json: Record<string, unknown> }> {
  const { wanted, callTime, searchId, body, demo } = input
  const name = cleanText(body?.name, 120)
  const email = cleanText(body?.email, 200)?.toLowerCase() ?? null
  const phone = cleanText(body?.phone, 40)
  if (!name) return { status: 400, json: { error: 'Please add your name.' } }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: 400, json: { error: 'Please enter a valid email address.' } }
  try { trackerToken('check') } catch { return { status: 503, json: { error: 'Intro requests are not switched on yet.' } } }

  // Stop the form being used to spam someone's inbox.
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { data: existing } = await admin.from('foundry_contacts').select('id').eq('email', email).maybeSingle()
  if (existing) {
    const { count } = await admin.from('intro_batches').select('id', { count: 'exact', head: true })
      .eq('contact_id', existing.id).is('verified_at', null).gte('created_at', since)
    if ((count ?? 0) >= MAX_PENDING_PER_EMAIL) {
      return { status: 429, json: { error: 'We’ve already sent a few confirmation emails to that address. Check your inbox (and spam).' } }
    }
  }

  const partners = await loadPartners(admin, { includeDemo: demo })
  const byId = new Map(partners.map(p => [p.id, p]))
  const toCreate = wanted.filter(w => byId.has(w.id))
  if (!toCreate.length) return { status: 400, json: { error: 'Those partners aren’t available right now.' } }

  // Upsert the contact by email. Marketing opt-in only ever goes from no to yes here.
  let contactId = existing?.id as string | undefined
  if (contactId) {
    await admin.from('foundry_contacts').update({
      name, ...(phone ? { phone } : {}), ...(body?.marketing === true ? { marketing_opt_in: true } : {}),
    }).eq('id', contactId)
  } else {
    const { data: c, error } = await admin.from('foundry_contacts').insert({
      email, name, phone, marketing_opt_in: body?.marketing === true, is_demo: demo,
    }).select('id').single()
    if (error || !c) return { status: 500, json: { error: 'Could not save your request. Please try again.' } }
    contactId = c.id
  }

  const q = parseQuery(typeof body?.q === 'string' ? body.q : '')
  const context = {
    sector: q.sector?.label ?? null,
    area: q.area?.label ?? null,
    budget: q.budget ? formatBudget(q.budget) : null,
    stage: q.stage ?? null,
    role: 'visitor',
  }
  const verify = newVerifyToken()
  const { data: batch, error: bErr } = await admin.from('intro_batches').insert({
    contact_id: contactId, source: 'website', search_id: isUuid(searchId) ? searchId : null,
    context, call_time: callTime, consent_at: new Date().toISOString(),
    verify_token_hash: verify.hash, is_demo: demo,
  }).select('id').single()
  if (bErr || !batch) return { status: 500, json: { error: 'Could not save your request. Please try again.' } }

  const { data: rows, error: rErr } = await admin.from('intro_requests').insert(toCreate.map(w => ({
    partner_id: w.id, batch_id: batch.id, need: w.need, message: w.need,
    status: 'pending', stage: 'awaiting_verification', is_demo: demo,
  }))).select('id')
  if (rErr || !rows) {
    await admin.from('intro_batches').delete().eq('id', batch.id)
    return { status: 500, json: { error: 'Could not save your request. Please try again.' } }
  }
  await admin.from('intro_events').insert(rows.map(r => ({
    intro_request_id: r.id, kind: 'requested', body: 'You requested an intro', visible_to_requester: true,
  })))

  await sendVerifyEmail(email, name, toCreate.map(w => byId.get(w.id)!.name), verifyUrl(batch.id, verify.token))
  return { status: 200, json: { verify: true, email, count: rows.length } }
}
