/**
 * My intros: everything one member has asked us to introduce them to.
 * Server only (service-role client). Partner contact details are included
 * only once the partner has made contact, and never anything admin-only.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { NEED_LABEL, type Need } from './taxonomy.ts'
import { introStatus, OPEN_STAGES, type IntroStage, type IntroStatus, type Rating } from './intro-status.ts'

export interface MyIntro {
  id: string
  partner: { id: string; name: string; slug: string; categoryLabel: string }
  need: string | null
  stage: IntroStage
  createdAt: string
  rating: Rating | null
  status: IntroStatus
  contact: { name: string; role: string | null; email: string | null; phone: string | null } | null
  events: { id: string; body: string; at: string }[]
}

export async function loadMyIntros(
  admin: SupabaseClient, viewerId: string, { includeDemo }: { includeDemo: boolean },
): Promise<MyIntro[]> {
  let q = admin.from('intro_requests')
    .select('id, partner_id, need, message, stage, created_at, sla_due_at, outcome, rating, is_demo, partners(id, name, slug, category)')
    .eq('requester_id', viewerId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (!includeDemo) q = q.eq('is_demo', false)
  const { data: rows, error } = await q
  if (error) throw new Error(`loadMyIntros: ${error.message}`)
  if (!rows?.length) return []

  const ids = rows.map(r => r.id)
  const contactPartnerIds = rows
    .filter(r => introStatus(r.stage as IntroStage).contactVisible)
    .map(r => r.partner_id)

  const [{ data: events }, { data: contacts }] = await Promise.all([
    admin.from('intro_events').select('id, intro_request_id, body, created_at')
      .in('intro_request_id', ids).eq('visible_to_requester', true)
      .order('created_at', { ascending: false }),
    contactPartnerIds.length
      ? admin.from('partner_contacts').select('partner_id, name, role, email, phone, is_primary')
          .in('partner_id', contactPartnerIds).order('is_primary', { ascending: false })
      : Promise.resolve({ data: [] as { partner_id: string; name: string; role: string | null; email: string | null; phone: string | null }[] }),
  ])

  return rows.map(r => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (r as any).partners ?? {}
    const stage = r.stage as IntroStage
    const status = introStatus(stage, { outcome: r.outcome, slaDueAt: r.sla_due_at, rated: !!r.rating })
    const c = status.contactVisible ? (contacts ?? []).find(x => x.partner_id === r.partner_id) : undefined
    return {
      id: r.id,
      partner: { id: p.id ?? r.partner_id, name: p.name ?? 'Partner', slug: p.slug ?? '', categoryLabel: NEED_LABEL[p.category as Need] ?? 'Partner' },
      need: r.need ?? r.message ?? null,
      stage,
      createdAt: r.created_at,
      rating: (r.rating as Rating | null) ?? null,
      status,
      contact: c ? { name: c.name, role: c.role, email: c.email, phone: c.phone } : null,
      events: (events ?? []).filter(e => e.intro_request_id === r.id).map(e => ({ id: e.id, body: e.body ?? '', at: e.created_at })),
    }
  })
}

export async function countOpenIntros(admin: SupabaseClient, viewerId: string, { includeDemo }: { includeDemo: boolean }): Promise<number> {
  let q = admin.from('intro_requests').select('id', { count: 'exact', head: true })
    .eq('requester_id', viewerId).in('stage', OPEN_STAGES)
  if (!includeDemo) q = q.eq('is_demo', false)
  const { count } = await q
  return count ?? 0
}
