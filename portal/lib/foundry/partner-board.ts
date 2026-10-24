/**
 * Admin Partners page: every partner with how they're doing (intros, how
 * many turned into work, how fast they reply) and what needs attention.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { NEED_LABEL, NEEDS, type Need } from './taxonomy.ts'
import { profileGaps } from './partner-input.ts'

export interface BoardRow {
  id: string
  name: string
  slug: string
  category: string
  categoryLabel: string
  status: 'draft' | 'live' | 'paused'
  trust: 'listed' | 'trusted' | 'recommended'
  deal: string | null
  isDemo: boolean
  intros30: number
  /** Hired ÷ closed with an outcome, as a whole percent. null when nothing has closed. */
  toWork: number | null
  /** Median hours from briefed to first contact. */
  replyHours: number | null
  stuck: number
  gaps: string[]
}

export interface Board {
  rows: BoardRow[]
  kpis: { live: number; total: number; categoriesCovered: number; intros30: number; introsPrev30: number; toWork: number | null; replyHours: number | null; deals: number }
  attention: { id: string; name: string; text: string }[]
}

const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2)
}

export async function loadPartnerBoard(admin: SupabaseClient, { includeDemo }: { includeDemo: boolean }): Promise<Board> {
  let pq = admin.from('partners').select('id, name, slug, category, status, trust_level, offer_text, is_demo, tagline, description, our_take, price_from, regions, services, display_order')
    .order('display_order', { ascending: true })
  if (!includeDemo) pq = pq.eq('is_demo', false)
  const since60 = new Date(Date.now() - 60 * 86_400_000).toISOString()
  let iq = admin.from('intro_requests').select('partner_id, stage, created_at, briefed_at, contacted_at, outcome')
    .not('partner_id', 'is', null).not('stage', 'in', '(awaiting_verification,expired)').limit(20_000)
  if (!includeDemo) iq = iq.eq('is_demo', false)
  const [{ data: partners }, { data: intros }, { data: contacts }] = await Promise.all([
    pq, iq, admin.from('partner_contacts').select('partner_id'),
  ])

  const now = Date.now()
  const d30 = now - 30 * 86_400_000
  const contactCount = new Map<string, number>()
  for (const c of contacts ?? []) contactCount.set(c.partner_id, (contactCount.get(c.partner_id) ?? 0) + 1)
  const I = intros ?? []

  const rows: BoardRow[] = (partners ?? []).map(p => {
    const mine = I.filter(r => r.partner_id === p.id)
    const closed = mine.filter(r => r.outcome === 'hired' || r.outcome === 'not_hired')
    const replies = mine.filter(r => r.briefed_at && r.contacted_at)
      .map(r => (new Date(r.contacted_at!).getTime() - new Date(r.briefed_at!).getTime()) / 3_600_000)
      .filter(h => h >= 0)
    return {
      id: p.id, name: p.name, slug: p.slug, category: p.category,
      categoryLabel: NEED_LABEL[p.category as Need] ?? p.category ?? 'Other',
      status: p.status, trust: p.trust_level, deal: p.offer_text, isDemo: p.is_demo,
      intros30: mine.filter(r => new Date(r.created_at).getTime() >= d30).length,
      toWork: closed.length ? Math.round((closed.filter(r => r.outcome === 'hired').length / closed.length) * 100) : null,
      replyHours: median(replies),
      stuck: mine.filter(r => r.stage === 'briefed' && r.briefed_at && now - new Date(r.briefed_at).getTime() > 48 * 3_600_000).length,
      gaps: profileGaps(p, contactCount.get(p.id) ?? 0),
    }
  })

  const live = rows.filter(r => r.status === 'live')
  const closedAll = I.filter(r => r.outcome === 'hired' || r.outcome === 'not_hired')
  const repliesAll = I.filter(r => r.briefed_at && r.contacted_at)
    .map(r => (new Date(r.contacted_at!).getTime() - new Date(r.briefed_at!).getTime()) / 3_600_000).filter(h => h >= 0)

  const attention: Board['attention'] = []
  for (const r of rows) {
    if (r.stuck) attention.push({ id: r.id, name: r.name, text: `hasn’t been in touch on ${r.stuck} briefed ${r.stuck === 1 ? 'intro' : 'intros'} after 48h` })
  }
  for (const r of live) {
    if (r.gaps.length) attention.push({ id: r.id, name: r.name, text: `is live but missing ${r.gaps.slice(0, 3).join(', ')}` })
  }
  for (const r of rows.filter(x => x.status === 'draft')) {
    attention.push({ id: r.id, name: r.name, text: r.gaps.length ? `is a draft: add ${r.gaps.slice(0, 3).join(', ')} to go live` : 'is a draft and ready to go live' })
  }

  return {
    rows,
    kpis: {
      live: live.length, total: rows.length,
      categoriesCovered: new Set(live.map(r => r.category).filter(c => NEEDS.includes(c as Need))).size,
      intros30: I.filter(r => new Date(r.created_at).getTime() >= d30).length,
      introsPrev30: I.filter(r => { const t = new Date(r.created_at).getTime(); return t < d30 && r.created_at >= since60 }).length,
      toWork: closedAll.length ? Math.round((closedAll.filter(r => r.outcome === 'hired').length / closedAll.length) * 100) : null,
      replyHours: median(repliesAll),
      deals: live.filter(r => r.deal).length,
    },
    attention: attention.slice(0, 6),
  }
}
