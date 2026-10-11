/**
 * Admin intro pipeline: load the board, and move intros through it.
 * Every move writes an intro_events row, keeps the legacy `status` column in
 * step, and tells the member. Partner emails in demo go to the preview list.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { NEED_LABEL, type Need } from './taxonomy.ts'
import { OPEN_STAGES, type IntroStage } from './intro-status.ts'
import { briefTemplate, chaseTemplate, briefSubject, textEmailHtml, escapeHtml, type BriefInput } from './brief.ts'
import { sendEmail } from '@/lib/email/resend'
import { notify } from '@/lib/notifications'
import { trackerUrl, newVerifyToken, verifyUrl } from './tracker'
import { sendVisitorUpdate, sendVerifyEmail } from './visitor-email'
import { briefDueAt } from './sla'

export const BOARD_STAGES = ['to_source', 'to_brief', 'briefed', 'in_contact', 'outcome'] as const
export type PipelineView = 'open' | 'closed' | 'unconfirmed'
export type BoardStage = typeof BOARD_STAGES[number]

const CONTACT_SLA_HOURS = 24

export interface PartnerContact { id: string; name: string; email: string | null; phone: string | null; role: string | null; is_primary: boolean }

export interface PipelineCard {
  id: string
  stage: IntroStage
  isDemo: boolean
  source: string
  createdAt: string
  stageSince: string
  slaDueAt: string | null
  overdue: boolean
  chasedAt: string | null
  need: string | null
  outcome: string | null
  rating: string | null
  member: { id: string; name: string; email: string | null; phone: string | null; role: string | null; contactId: string | null; leadId: string | null }
  /** Placeholder (id '') while a sourcing request has no partner yet. */
  partner: { id: string; name: string; slug: string; categoryLabel: string; deal: string | null }
  /** Set on "find me a partner" requests: what they asked us to source. */
  sourcing: { category: string | null; categoryLabel: string; area: string | null } | null
  contacts: PartnerContact[]
  context: BriefInput['context']
  callTime: string | null
  briefDraft: string
  briefSent: string | null
  events: { id: string; kind: string; body: string; at: string; visible: boolean }[]
}

export async function loadPipeline(
  admin: SupabaseClient,
  { includeDemo, view, senderName }: { includeDemo: boolean; view: PipelineView; senderName: string },
): Promise<PipelineCard[]> {
  const stages = view === 'open' ? OPEN_STAGES.filter(s => s !== 'awaiting_verification')
    : view === 'unconfirmed' ? ['awaiting_verification'] : ['closed', 'withdrawn', 'expired']
  let q = admin.from('intro_requests')
    .select(`id, stage, is_demo, created_at, updated_at, briefed_at, contacted_at, outcome_at, closed_at, sla_due_at, chased_at,
      need, message, outcome, rating, brief_email, partner_id, requester_id, source_category, source_area,
      profiles!intro_requests_requester_id_fkey(id, full_name, email, phone, role),
      partners(id, name, slug, category, offer_text),
      intro_batches(source, context, call_time, foundry_contacts(id, name, email, phone, lead_id))`)
    .in('stage', stages)
    .order('created_at', { ascending: view !== 'closed' })
    .limit(view === 'closed' ? 100 : 300)
  if (!includeDemo) q = q.eq('is_demo', false)
  const { data: rows, error } = await q
  if (error) throw new Error(`loadPipeline: ${error.message}`)
  if (!rows?.length) return []

  const partnerIds = [...new Set(rows.map(r => r.partner_id).filter(Boolean))]
  const [{ data: contacts }, { data: events }] = await Promise.all([
    admin.from('partner_contacts').select('id, partner_id, name, email, phone, role, is_primary')
      .in('partner_id', partnerIds).order('is_primary', { ascending: false }),
    admin.from('intro_events').select('id, intro_request_id, kind, body, created_at, visible_to_requester')
      .in('intro_request_id', rows.map(r => r.id)).order('created_at', { ascending: false }),
  ])

  const now = Date.now()
  return rows.map(r => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const x = r as any
    const m = x.profiles ?? {}
    const p = x.partners ?? {}
    const b = x.intro_batches ?? {}
    const stage = r.stage as IntroStage
    const stageSince = (stage === 'briefed' ? r.briefed_at : stage === 'in_contact' ? r.contacted_at : stage === 'outcome' ? r.outcome_at
      : stage === 'to_brief' || stage === 'to_source' || stage === 'awaiting_verification' ? r.updated_at ?? r.created_at : r.closed_at) ?? r.updated_at ?? r.created_at
    const pc = (r.partner_id ? (contacts ?? []).filter(c => c.partner_id === r.partner_id) : []) as (PartnerContact & { partner_id: string })[]
    const context = (b.context ?? {}) as BriefInput['context']
    const fc = b.foundry_contacts ?? {}
    // Website visitors have no profile until they verify with a matching email.
    const member = m.id
      ? { id: m.id, name: m.full_name || m.email || 'Member', email: m.email ?? null, phone: m.phone ?? null, role: m.role ?? null, contactId: fc.id ?? null, leadId: fc.lead_id ?? null }
      : { id: '', name: fc.name || fc.email || 'Website visitor', email: fc.email ?? null, phone: fc.phone ?? null, role: 'visitor', contactId: fc.id ?? null, leadId: fc.lead_id ?? null }
    const sourceLabel = NEED_LABEL[r.source_category as Need] ?? 'Partner'
    const sourcing = r.partner_id ? null : { category: r.source_category ?? null, categoryLabel: sourceLabel, area: r.source_area ?? null }
    const need = r.need ?? r.message ?? null
    const overdue = (stage === 'to_brief' || stage === 'briefed') && !!r.sla_due_at && new Date(r.sla_due_at).getTime() < now
    return {
      id: r.id,
      stage,
      isDemo: r.is_demo,
      source: b.source ?? 'portal',
      createdAt: r.created_at,
      stageSince,
      slaDueAt: r.sla_due_at,
      overdue,
      chasedAt: r.chased_at,
      need,
      outcome: r.outcome,
      rating: r.rating,
      member,
      partner: r.partner_id
        ? { id: p.id ?? r.partner_id, name: p.name ?? 'Partner', slug: p.slug ?? '', categoryLabel: NEED_LABEL[p.category as Need] ?? 'Partner', deal: p.offer_text ?? null }
        : { id: '', name: `Find a ${sourceLabel.toLowerCase()} partner`, slug: '', categoryLabel: sourceLabel, deal: null },
      sourcing,
      contacts: pc.map(({ partner_id: _, ...c }) => c),
      context: { ...context, role: context.role ?? member.role },
      callTime: b.call_time ?? null,
      briefDraft: !r.partner_id ? '' : briefTemplate({
        partnerName: p.name ?? 'Partner', contactName: pc[0]?.name ?? null,
        memberName: member.name, memberEmail: member.email, memberPhone: member.phone,
        context: { ...context, role: context.role ?? member.role }, need, callTime: b.call_time ?? null, deal: p.offer_text ?? null, senderName,
      }),
      briefSent: r.brief_email,
      events: (events ?? []).filter(e => e.intro_request_id === r.id)
        .map(e => ({ id: e.id, kind: e.kind, body: e.body ?? '', at: e.created_at, visible: e.visible_to_requester })),
    }
  })
}

// ── Moves ──────────────────────────────────────────────────────────────────

export type IntroAction =
  | { action: 'brief'; to: string; subject?: string; body: string }
  | { action: 'chase'; to: string; body: string }
  | { action: 'contacted' }
  | { action: 'ask_outcome' }
  | { action: 'close'; outcome: 'hired' | 'not_hired' | 'undecided' }
  | { action: 'note'; body: string }
  | { action: 'assign'; partnerId: string }
  | { action: 'resend_verify' }
  | { action: 'convert_lead' }

interface Actor { id: string | null; name: string }

function previewRecipients(): string[] {
  return (process.env.FOUNDRY_PREVIEW_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
}

/** Send to a partner; in demo, redirect to the preview list so no real partner is emailed. */
async function emailPartner(to: string, subject: string, text: string, demo: boolean) {
  if (demo) {
    const real = to
    for (const r of previewRecipients()) {
      await sendEmail({ to: r, subject: `[Demo → ${real}] ${subject}`, html: textEmailHtml(text) })
    }
    return
  }
  await sendEmail({ to, subject, html: textEmailHtml(text) })
}

function memberLink(role: string | null) {
  return `/${role === 'franchisor' ? 'franchisor' : role === 'admin' ? 'admin' : 'franchisee'}/foundry/intros`
}

export async function performIntroAction(admin: SupabaseClient, id: string, act: IntroAction, actor: Actor): Promise<{ ok: true } | { error: string }> {
  const { data: r } = await admin.from('intro_requests')
    .select(`id, stage, is_demo, requester_id, batch_id, partner_id, need, message, source_area, created_at, partners(name),
      profiles!intro_requests_requester_id_fkey(full_name, role),
      intro_batches(verified_at, context, foundry_contacts(id, name, email, phone, lead_id))`)
    .eq('id', id).maybeSingle()
  if (!r) return { error: 'Intro not found.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const x = r as any
  const partner: string = x.partners?.name ?? 'the partner'
  const visitor = x.intro_batches?.foundry_contacts as { id: string; name: string | null; email: string | null; phone: string | null; lead_id: string | null } | null
  const memberName: string = x.profiles?.full_name ?? visitor?.name ?? 'the member'
  const memberRole: string | null = x.profiles?.role ?? null
  const stage = r.stage as IntroStage
  const demo = r.is_demo as boolean
  const now = new Date()
  const iso = now.toISOString()

  const event = (kind: string, body: string, visible: boolean) =>
    admin.from('intro_events').insert({ intro_request_id: id, kind, actor_id: actor.id, body, visible_to_requester: visible })
  // Portal members get in-app + email + push; website visitors get an email with their tracker link.
  const tellMember = (title: string, body: string) => r.requester_id
    ? notify({ userId: r.requester_id, event: 'intro_update', title, body, link: memberLink(memberRole) }).catch(e => console.error('[pipeline] notify member failed', e))
    : visitor?.email && r.batch_id
      ? sendVisitorUpdate(visitor.email, visitor.name, title, body, trackerUrl(r.batch_id)).catch(e => console.error('[pipeline] visitor email failed', e))
      : Promise.resolve()

  switch (act.action) {
    case 'brief': {
      if (!['to_brief', 'briefed'].includes(stage)) return { error: 'Only intros waiting to be briefed can be briefed.' }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(act.to)) return { error: 'Enter the partner’s email address.' }
      const body = act.body.trim().slice(0, 6000)
      if (!body) return { error: 'The briefing email is empty.' }
      await emailPartner(act.to, act.subject?.trim() || briefSubject({ memberName, partnerName: partner }), body, demo)
      const due = new Date(now.getTime() + CONTACT_SLA_HOURS * 3600_000).toISOString()
      await admin.from('intro_requests').update({
        stage: 'briefed', status: 'sent', briefed_at: iso, brief_email: body, sla_due_at: due, updated_at: iso,
      }).eq('id', id)
      await event('briefed', `We briefed ${partner} on your plan`, true)
      await event('brief_sent', `Briefing sent to ${act.to}${demo ? ' (demo: redirected to preview list)' : ''} by ${actor.name}`, false)
      await tellMember(`We’ve briefed ${partner}`, 'They’ll be in touch, usually within a working day.')
      return { ok: true }
    }
    case 'chase': {
      if (!['briefed', 'in_contact'].includes(stage)) return { error: 'Only briefed intros can be chased.' }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(act.to)) return { error: 'Enter the partner’s email address.' }
      await emailPartner(act.to, `Following up: ${memberName}`, act.body.trim().slice(0, 4000), demo)
      await admin.from('intro_requests').update({ chased_at: iso, updated_at: iso }).eq('id', id)
      await event('chased', `Chased ${partner} (${act.to}) by ${actor.name}`, false)
      return { ok: true }
    }
    case 'contacted': {
      if (stage !== 'briefed') return { error: 'Brief the partner first.' }
      await admin.from('intro_requests').update({ stage: 'in_contact', contacted_at: iso, sla_due_at: null, updated_at: iso }).eq('id', id)
      await event('contacted', `${partner} has been in touch. Their details are below.`, true)
      await tellMember(`${partner} has been in touch`, 'Their contact details are now in My intros.')
      return { ok: true }
    }
    case 'ask_outcome': {
      if (stage !== 'in_contact') return { error: 'Only intros in contact can move to outcome.' }
      await admin.from('intro_requests').update({ stage: 'outcome', outcome_at: iso, updated_at: iso }).eq('id', id)
      await event('outcome_asked', `How did it go with ${partner}? Let us know below.`, true)
      await tellMember(`How did it go with ${partner}?`, 'A quick rating in My intros helps us keep The Foundry honest.')
      return { ok: true }
    }
    case 'close': {
      if (!OPEN_STAGES.includes(stage)) return { error: 'This intro is already closed.' }
      const words = act.outcome === 'hired' ? 'You went ahead with them' : act.outcome === 'not_hired' ? 'Not taken forward' : 'Closed'
      await admin.from('intro_requests').update({ stage: 'closed', status: 'completed', outcome: act.outcome, closed_at: iso, sla_due_at: null, updated_at: iso }).eq('id', id)
      await event('closed', `${words}. We’ve closed this intro.`, true)
      return { ok: true }
    }
    case 'note': {
      const body = act.body.trim().slice(0, 2000)
      if (!body) return { error: 'Empty note.' }
      await event('note', `${actor.name}: ${body}`, false)
      return { ok: true }
    }
    case 'assign': {
      // Pick a partner for a sourcing request, or swap the partner before they've been in touch.
      const first = stage === 'to_source'
      if (!first && !['to_brief', 'briefed'].includes(stage)) return { error: 'You can only change the partner before they’ve made contact.' }
      if (act.partnerId === r.partner_id) return { error: 'That’s already the partner on this intro.' }
      const { data: np } = await admin.from('partners').select('id, name, status, is_demo').eq('id', act.partnerId).maybeSingle()
      if (!np) return { error: 'Partner not found.' }
      if (np.status !== 'live') return { error: `${np.name} isn’t live, so we can’t introduce them.` }
      if (np.is_demo && !demo) return { error: 'That’s a demo partner. Pick a real one.' }
      await admin.from('intro_requests').update({
        partner_id: np.id, stage: 'to_brief', status: 'pending', briefed_at: null, brief_email: null, chased_at: null,
        sla_due_at: briefDueAt(now).toISOString(), updated_at: iso,
      }).eq('id', id)
      if (first) {
        await event('assigned', `We’ve found you a partner: ${np.name}. We’re briefing them now.`, true)
        await event('assigned_by', `${actor.name} assigned ${np.name}`, false)
        await tellMember(`We’ve found you a partner: ${np.name}`, 'We’re briefing them on what you need now. They’ll be in touch, usually within a working day.')
      } else {
        await event('reassigned', `We’ve swapped this intro to ${np.name}, a better fit for what you need.`, true)
        await event('reassigned_by', `${actor.name} swapped ${partner} for ${np.name}${stage === 'briefed' ? ` (${partner} had already been briefed)` : ''}`, false)
        await tellMember(`We’ve matched you with ${np.name} instead`, `We think they’re a better fit than ${partner}. We’re briefing them now.`)
      }
      return { ok: true }
    }
    case 'resend_verify': {
      if (stage !== 'awaiting_verification') return { error: 'This request is already confirmed.' }
      if (!visitor?.email || !r.batch_id || x.intro_batches?.verified_at) return { error: 'No email to resend to.' }
      const verify = newVerifyToken()
      await admin.from('intro_batches').update({ verify_token_hash: verify.hash }).eq('id', r.batch_id)
      // The new link confirms the whole batch, so list every request in it.
      const { data: siblings } = await admin.from('intro_requests').select('partner_id, source_category, source_area, partners(name)')
        .eq('batch_id', r.batch_id).eq('stage', 'awaiting_verification')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const names = ((siblings ?? []) as any[]).map(s => s.partners?.name
        ?? `A ${(NEED_LABEL[s.source_category as Need] ?? 'partner').toLowerCase()} partner${s.source_area ? ` in ${s.source_area}` : ''} (we’ll find one)`)
      await sendVerifyEmail(visitor.email, visitor.name, names.length ? names : [partner], verifyUrl(r.batch_id, verify.token))
      await admin.from('intro_requests').update({ updated_at: iso }).eq('id', id)
      await event('verify_resent', `Confirmation email resent to ${visitor.email} by ${actor.name}`, false)
      return { ok: true }
    }
    case 'convert_lead': {
      if (!visitor?.email) return { error: 'Only website contacts can be added to Leads.' }
      if (visitor.lead_id) return { error: 'Already in Leads.' }
      // Link an existing lead with the same email rather than duplicating it.
      const { data: existing } = await admin.from('leads').select('id').ilike('email', visitor.email.replace(/[\\%_]/g, '\\$&')).limit(1).maybeSingle()
      let leadId = existing?.id as string | undefined
      if (!leadId) {
        const area: string | null = x.intro_batches?.context?.area ?? r.source_area ?? null
        const { data: lead, error } = await admin.from('leads').insert({
          full_name: visitor.name || visitor.email, email: visitor.email, phone: visitor.phone, status: 'new', source: 'foundry',
          goals: `From The Foundry: ${r.need ?? r.message ?? 'intro request'}`.slice(0, 2000),
          preferred_locations: area ? [area] : [],
        }).select('id').single()
        if (error || !lead) return { error: 'Could not add them to Leads.' }
        leadId = lead.id
      }
      await admin.from('foundry_contacts').update({ lead_id: leadId }).eq('id', visitor.id)
      await event('lead_created', `${existing ? 'Linked to existing lead' : 'Added to Leads'} by ${actor.name}`, false)
      return { ok: true }
    }
  }
}

export function chaseDraft(card: Pick<PipelineCard, 'partner' | 'contacts' | 'member'>, senderName: string) {
  return chaseTemplate({ partnerName: card.partner.name, contactName: card.contacts[0]?.name ?? null, memberName: card.member.name, senderName })
}

export { escapeHtml }
