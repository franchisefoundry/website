/**
 * Search insights: what people look for, where we come up short, and who to
 * recruit next. Read-only aggregates over search_events, foundry_events and
 * intro_requests. Small data for now, so it's counted in memory.
 *
 * Channel: searches carry their surface. Profile views have no surface, so a
 * signed-in viewer counts as portal and an anonymous one as website.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { NEEDS, NEED_LABEL, type Need } from './taxonomy.ts'

export const PERIODS = [[7, '7 days'], [30, '30 days'], [90, '90 days']] as const
export type Channel = 'all' | 'website' | 'portal'
export type RoleFilter = 'all' | 'franchisee' | 'franchisor' | 'introducer' | 'visitor'

export interface Insights {
  funnel: { label: string; n: number; note: string }[]
  gaps: { query: string; n: number; why: string; need: Need | null; area: string | null; application: { id: string; company: string } | null; outreach: 'todo' | 'done' | null }[]
  demand: { need: Need; label: string; searches: number; partners: number; flag: 'No supply' | 'Stretched' | 'OK' }[]
  top: { query: string; n: number }[]
  partners: { id: string; name: string; slug: string; views: number; intros: number; won: number; feedback: string | null }[]
  roles: { role: string; n: number }[]
}

const norm = (q: string) => q.toLowerCase().replace(/\s+/g, ' ').trim()

function feedbackLabel(ratings: string[]): string | null {
  if (!ratings.length) return null
  const bad = ratings.filter(r => r === 'slow' || r === 'not_fit').length
  if (bad === 0) return 'Going well'
  if (bad / ratings.length >= 0.5) return ratings.filter(r => r === 'slow').length >= ratings.filter(r => r === 'not_fit').length ? 'Slow to reply' : 'Not a fit'
  return 'Mixed'
}

export async function loadInsights(
  admin: SupabaseClient,
  { days, channel, role, includeDemo }: { days: number; channel: Channel; role: RoleFilter; includeDemo: boolean },
): Promise<Insights> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const demo = <T extends { eq: (c: string, v: boolean) => T }>(q: T) => includeDemo ? q : q.eq('is_demo', false)

  let sq = admin.from('search_events').select('raw_query, parsed, role, surface, result_count, unmet_needs').gte('created_at', since).limit(20_000)
  if (channel !== 'all') sq = sq.eq('surface', channel)
  if (role === 'visitor') sq = sq.is('role', null)
  else if (role !== 'all') sq = sq.eq('role', role)
  let vq = admin.from('foundry_events').select('partner_id, profile_id').eq('kind', 'profile_view').gte('created_at', since).limit(20_000)
  if (channel === 'website') vq = vq.is('profile_id', null)
  if (channel === 'portal') vq = vq.not('profile_id', 'is', null)
  const iq = admin.from('intro_requests')
    .select('partner_id, stage, briefed_at, outcome, rating, intro_batches(source), profiles!intro_requests_requester_id_fkey(role)')
    .gte('created_at', since).not('stage', 'in', '(awaiting_verification,expired)').limit(20_000)
  const pq = admin.from('partners').select('id, name, slug, category, status').eq('status', 'live')
  const aq = admin.from('partner_applications').select('id, company_name, category').in('status', ['new', 'vetting'])
  const oq = admin.from('foundry_outreach').select('query, status')

  const [{ data: searches }, { data: views }, { data: introsRaw }, { data: partners }, { data: apps }, { data: outreach }] = await Promise.all([
    demo(sq), demo(vq), demo(iq), demo(pq), demo(aq), demo(oq),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intros = ((introsRaw ?? []) as any[]).filter(r => {
    const src = r.intro_batches?.source ?? 'portal'
    if (channel === 'website' && src !== 'website') return false
    if (channel === 'portal' && src === 'website') return false
    if (role === 'visitor') return !r.profiles
    if (role !== 'all') return r.profiles?.role === role
    return true
  })
  const S = searches ?? []
  const V = views ?? []

  const n = [S.length, V.length, intros.length, intros.filter(r => r.briefed_at).length, intros.filter(r => r.outcome === 'hired').length]
  const labels = ['Searches', 'Profile views', 'Intro requests', 'Introduced', 'Work won']
  const funnel = labels.map((label, i) => ({
    label, n: n[i],
    note: i === 0 ? (channel === 'all' ? 'Website + portal' : channel === 'website' ? 'Website only' : 'Portal only')
      : n[i - 1] ? `${Math.round((n[i] / n[i - 1]) * 100)}% of previous step` : '',
  }))

  // Searches we couldn't answer, grouped by what they typed.
  const gapMap = new Map<string, { query: string; n: number; need: Need | null; area: string | null }>()
  for (const s of S) {
    const unmet = (s.unmet_needs ?? []) as Need[]
    if (!unmet.length && s.result_count > 0) continue
    const k = norm(s.raw_query)
    if (!k) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = s.parsed as any
    const g = gapMap.get(k) ?? { query: k, n: 0, need: unmet[0] ?? p?.needs?.[0] ?? null, area: p?.area?.label ?? null }
    g.n++
    gapMap.set(k, g)
  }
  const done = new Map((outreach ?? []).map(o => [norm(o.query), o.status as 'todo' | 'done']))
  const gaps = [...gapMap.values()].sort((a, b) => b.n - a.n).slice(0, 12).map(g => {
    const app = g.need ? (apps ?? []).find(a => a.category === g.need) : undefined
    const label = g.need ? NEED_LABEL[g.need].toLowerCase() : null
    const why = app ? `${app.company_name} applied · in vetting`
      : label ? `No ${label} partner${g.area ? ` covering ${g.area}` : ''}` : 'Nothing matched'
    return { ...g, why, application: app ? { id: app.id, company: app.company_name } : null, outreach: done.get(g.query) ?? null }
  })

  // Demand vs supply by need.
  const demand = NEEDS.map(need => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchesFor = S.filter(s => ((s.parsed as any)?.needs ?? []).includes(need)).length
    const supply = (partners ?? []).filter(p => p.category === need).length
    const flag: 'No supply' | 'Stretched' | 'OK' = supply === 0 ? 'No supply' : searchesFor / supply > 20 ? 'Stretched' : 'OK'
    return { need, label: NEED_LABEL[need], searches: searchesFor, partners: supply, flag }
  }).filter(d => d.searches > 0 || d.partners > 0).sort((a, b) => b.searches - a.searches)

  const topMap = new Map<string, number>()
  for (const s of S) { const k = norm(s.raw_query); if (k) topMap.set(k, (topMap.get(k) ?? 0) + 1) }
  const top = [...topMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([query, c]) => ({ query, n: c }))

  const perf = (partners ?? []).map(p => {
    const mine = intros.filter(r => r.partner_id === p.id)
    return {
      id: p.id, name: p.name, slug: p.slug,
      views: V.filter(v => v.partner_id === p.id).length,
      intros: mine.length,
      won: mine.filter(r => r.outcome === 'hired').length,
      feedback: feedbackLabel(mine.map(r => r.rating).filter(Boolean) as string[]),
    }
  }).sort((a, b) => b.intros - a.intros || b.views - a.views)

  const roleMap = new Map<string, number>()
  for (const s of S) { const r = s.role ?? 'visitor'; roleMap.set(r, (roleMap.get(r) ?? 0) + 1) }
  const roles = [...roleMap.entries()].map(([r, c]) => ({ role: r, n: c })).sort((a, b) => b.n - a.n)

  return { funnel, gaps, demand, top, partners: perf, roles }
}
