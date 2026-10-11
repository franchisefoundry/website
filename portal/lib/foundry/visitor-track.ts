/** Server helpers for the website tracker page (no login: signed link). */
import type { SupabaseClient } from '@supabase/supabase-js'
import { NEED_LABEL, type Need } from './taxonomy.ts'
import { introStatus, type IntroStage, type Rating } from './intro-status.ts'
import type { MyIntro } from './my-intros'

export async function loadBatchIntros(admin: SupabaseClient, batchId: string): Promise<{ name: string | null; intros: MyIntro[] } | null> {
  const { data: batch } = await admin.from('intro_batches')
    .select('id, verified_at, foundry_contacts(name)').eq('id', batchId).maybeSingle()
  if (!batch) return null
  const { data: rows } = await admin.from('intro_requests')
    .select('id, partner_id, need, message, stage, created_at, sla_due_at, outcome, rating, partners(id, name, slug, category)')
    .eq('batch_id', batchId).order('created_at')
  const ids = (rows ?? []).map(r => r.id)
  const contactPartnerIds = (rows ?? []).filter(r => introStatus(r.stage as IntroStage).contactVisible).map(r => r.partner_id)
  const [{ data: events }, { data: contacts }] = await Promise.all([
    ids.length ? admin.from('intro_events').select('id, intro_request_id, body, created_at').in('intro_request_id', ids)
      .eq('visible_to_requester', true).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as { id: string; intro_request_id: string; body: string | null; created_at: string }[] }),
    contactPartnerIds.length ? admin.from('partner_contacts').select('partner_id, name, role, email, phone, is_primary')
      .in('partner_id', contactPartnerIds).order('is_primary', { ascending: false }) : Promise.resolve({ data: [] as { partner_id: string; name: string; role: string | null; email: string | null; phone: string | null }[] }),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const name = (batch as any).foundry_contacts?.name ?? null
  return {
    name,
    intros: (rows ?? []).map(r => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (r as any).partners ?? {}
      const stage = r.stage as IntroStage
      const status = introStatus(stage, { outcome: r.outcome, slaDueAt: r.sla_due_at, rated: !!r.rating })
      const c = status.contactVisible ? (contacts ?? []).find(x => x.partner_id === r.partner_id) : undefined
      return {
        id: r.id,
        partner: { id: p.id ?? r.partner_id, name: p.name ?? 'Partner', slug: p.slug ?? '', categoryLabel: NEED_LABEL[p.category as Need] ?? 'Partner' },
        need: r.need ?? r.message ?? null,
        stage, createdAt: r.created_at, rating: (r.rating as Rating | null) ?? null, status,
        contact: c ? { name: c.name, role: c.role, email: c.email, phone: c.phone } : null,
        events: (events ?? []).filter(e => e.intro_request_id === r.id).map(e => ({ id: e.id, body: e.body ?? '', at: e.created_at })),
      }
    }),
  }
}
