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
import { trackerUrl } from './tracker'
import { sendVisitorUpdate } from './visitor-email'

export const BOARD_STAGES = ['to_brief', 'briefed', 'in_contact', 'outcome'] as const
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
  member: { id: string; name: string; email: string | null; phone: string | null; role: string | null }
  partner: { id: string; name: string; slug: string; categoryLabel: string; deal: string | null }
  contacts: PartnerContact[]
  context: BriefInput['context']
  callTime: string | null
  briefDraft: string
  briefSent: string | null
  events: { id: string; kind: string; body: string; at: string; visible: boolean }[]
}

export async function loadPipeline(
  admin: SupabaseClient,
  { includeDemo, view, senderName }: { includeDemo: boolean; view: 'open' | 'closed'; senderName: string },
): Promise<PipelineCard[]> {
  const stages = view === 'open' ? OPEN_STAGES.filter(s => s !== 'awaiting_verification') : ['closed', 'withdrawn', 'expired']
  let q = admin.from('intro_requests')
    .select(`id, stage, is_demo, created_at, updated_at, briefed_at, contacted_at, outcome_at, closed_at, sla_due_at, chased_at,
      need, message, outcome, rating, brief_email, partner_id, requester_id,
      profiles!intro_requests_requester_id_fkey(id, full_name, email, phone, role),
      partners(id, name, slug, category, offer_text),
      intro_batches(source, context, call_time, foundry_contacts(name, email, phone))`)
    .in('stage', stages)
    .order('created_at', { ascending: view === 'open' })
    .limit(view === 'open' ? 300 : 100)
  if (!includeDemo) q = q.eq('is_demo', false)
  const { data: rows, error } = await q
  if (error) throw new Error(`loadPipeline: ${error.message}`)
  if (!rows?.length) return []

  const partnerIds = [...new Set(rows.map(r => r.partner_id))]
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
    const stageSince = (stage === 'briefed' ? r.briefed_at : stage === 'in_contact' ? r.contacted_at : stage === 'outcome' ? r.outcome_at : stage === 'to_brief' ? r.created_at : r.closed_at) ?? r.updated_at ?? r.created_at
    const pc = (contacts ?? []).filter(c => c.partner_id === r.partner_id) as (PartnerContact & { partner_id: string })[]
    const context = (b.context ?? {}) as BriefInput['context']
    const fc = b.foundry_contacts ?? {}
    // Website visitors have no profile until they verify with a matching email.
    const member = m.id
      ? { id: m.id, name: m.full_name || m.email || 'Member', email: m.email ?? null, phone: m.phone ?? null, role: m.role ?? null }
      : { id: '', name: fc.name || fc.email || 'Website visitor', email: fc.email ?? null, phone: fc.phone ?? null, role: 'visitor' }
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
      partner: { id: p.id ?? r.partner_id, name: p.name ?? 'Partner', slug: p.slug ?? '', categoryLabel: NEED_LABEL[p.category as Need] ?? 'Partner', deal: p.offer_text ?? null },
      contacts: pc.map(({ partner_id: _, ...c }) => c),
      context: { ...context, role: context.role ?? member.role },
      callTime: b.call_time ?? null,
      briefDraft: briefTemplate({
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
    .select('id, stage, is_demo, requester_id, batch_id, partners(name), profiles!intro_requests_requester_id_fkey(full_name, role), intro_batches(foundry_contacts(name, email))')
    .eq('id', id).maybeSingle()
  if (!r) return { error: 'Intro not found.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const x = r as any
  const partner: string = x.partners?.name ?? 'the partner'
  const visitor = x.intro_batches?.foundry_contacts as { name: string | null; email: string | null } | null
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
  }
}

export function chaseDraft(card: Pick<PipelineCard, 'partner' | 'contacts' | 'member'>, senderName: string) {
  return chaseTemplate({ partnerName: card.partner.name, contactName: card.contacts[0]?.name ?? null, memberName: card.member.name, senderName })
}

export { escapeHtml }
