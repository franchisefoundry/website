/**
 * The partner editor's form model: what admin can edit, how it's cleaned
 * before it reaches the database, and what a profile still needs before it
 * can go live. Pure, so the editor (client) and the API (server) agree.
 */
import { NEEDS, SECTORS, REGION_LABEL, type Need } from './taxonomy.ts'
import { slugify } from './applications-shared.ts'

export type PartnerStatus = 'draft' | 'live' | 'paused'

export interface PartnerForm {
  name: string
  slug: string
  category: Need | ''
  audience: 'franchisee' | 'franchisor' | 'both'
  status: PartnerStatus
  trust_level: 'listed' | 'trusted' | 'recommended'
  website: string
  logo_url: string
  tagline: string
  description: string
  our_take: string
  offer_text: string
  deal_terms: string
  deal_value_gbp: string
  base_location: string
  regions: string[]
  sectors: string[]
  budget_min_gbp: string
  budget_max_gbp: string
  price_from: string
  keywords: string
  client_count: string
  reply_hours_typical: string
  services: { title: string; description: string; price: string }[]
  faqs: { q: string; a: string }[]
  features: { label: string; value: string }[]
}

export const REGION_KEYS = ['uk', ...Object.keys(REGION_LABEL)]
export const SECTOR_KEYS = SECTORS.map(s => s.key)

export function emptyForm(): PartnerForm {
  return {
    name: '', slug: '', category: '', audience: 'franchisee', status: 'draft', trust_level: 'listed',
    website: '', logo_url: '', tagline: '', description: '', our_take: '', offer_text: '', deal_terms: '', deal_value_gbp: '',
    base_location: '', regions: [], sectors: [], budget_min_gbp: '', budget_max_gbp: '', price_from: '', keywords: '',
    client_count: '', reply_hours_typical: '', services: [], faqs: [], features: [],
  }
}

const str = (v: unknown) => (v == null ? '' : String(v))
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

/** A partners row (any shape from the DB) into the form. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formFromRow(r: any): PartnerForm {
  return {
    name: str(r.name), slug: str(r.slug), category: NEEDS.includes(r.category) ? r.category : '',
    audience: ['franchisee', 'franchisor', 'both'].includes(r.audience) ? r.audience : 'franchisee',
    status: ['draft', 'live', 'paused'].includes(r.status) ? r.status : 'draft',
    trust_level: ['listed', 'trusted', 'recommended'].includes(r.trust_level) ? r.trust_level : 'listed',
    website: str(r.website), logo_url: str(r.logo_url), tagline: str(r.tagline), description: str(r.description),
    our_take: str(r.our_take), offer_text: str(r.offer_text), deal_terms: str(r.deal_terms), deal_value_gbp: str(r.deal_value_gbp ?? ''),
    base_location: str(r.base_location), regions: arr<string>(r.regions), sectors: arr<string>(r.sectors),
    budget_min_gbp: str(r.budget_min_gbp ?? ''), budget_max_gbp: str(r.budget_max_gbp ?? ''), price_from: str(r.price_from),
    keywords: arr<string>(r.keywords).join(', '), client_count: str(r.client_count ?? ''), reply_hours_typical: str(r.reply_hours_typical ?? ''),
    services: arr<{ title?: string; description?: string; price?: string }>(r.services).map(s => ({ title: str(s.title), description: str(s.description), price: str(s.price) })),
    faqs: arr<{ q?: string; a?: string }>(r.faqs).map(f => ({ q: str(f.q), a: str(f.a) })),
    features: arr<{ label?: string; value?: string }>(r.features).map(f => ({ label: str(f.label), value: str(f.value) })),
  }
}

function clip(v: unknown, max: number): string | null {
  const t = str(v).trim().slice(0, max)
  return t || null
}

/** "£120k", "120,000", "120000" → 120000. Blank → null. */
export function parseMoney(v: unknown): number | null | 'bad' {
  const t = str(v).trim().toLowerCase().replace(/[£,\s]/g, '')
  if (!t) return null
  const m = t.match(/^(\d+(?:\.\d+)?)(k|m)?$/)
  if (!m) return 'bad'
  const n = Number(m[1]) * (m[2] === 'k' ? 1_000 : m[2] === 'm' ? 1_000_000 : 1)
  return Number.isFinite(n) && n <= 100_000_000 ? Math.round(n) : 'bad'
}

function parseCount(v: unknown, max: number): number | null | 'bad' {
  const t = str(v).trim()
  if (!t) return null
  const n = Number(t)
  return Number.isInteger(n) && n >= 0 && n <= max ? n : 'bad'
}

function normaliseUrl(v: unknown): string | null | 'bad' {
  const t = str(v).trim()
  if (!t) return null
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withScheme)
    return u.protocol === 'https:' || u.protocol === 'http:' ? (u.hostname.includes('.') ? u.toString().replace(/\/$/, '') : 'bad') : 'bad'
  } catch { return 'bad' }
}

export interface CleanResult {
  /** Columns ready for insert/update. */
  row: Record<string, unknown>
  /** Field → message, for the form. Empty when the input is usable. */
  errors: Partial<Record<keyof PartnerForm, string>>
}

/** Validate and shape the form for the partners table. Never trusts the client. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanPartnerInput(b: any): CleanResult {
  const errors: CleanResult['errors'] = {}
  const name = clip(b?.name, 120)
  if (!name) errors.name = 'Add the partner’s name.'
  const slug = slugify(clip(b?.slug, 60) ?? name ?? '')
  const category = NEEDS.includes(b?.category) ? b.category : null
  if (!category) errors.category = 'Pick a category.'
  const audience = ['franchisee', 'franchisor', 'both'].includes(b?.audience) ? b.audience : 'franchisee'
  const status: PartnerStatus = ['draft', 'live', 'paused'].includes(b?.status) ? b.status : 'draft'
  const trust = ['listed', 'trusted', 'recommended'].includes(b?.trust_level) ? b.trust_level : 'listed'

  const website = normaliseUrl(b?.website)
  if (website === 'bad') errors.website = 'That website doesn’t look right.'
  const logo = normaliseUrl(b?.logo_url)
  if (logo === 'bad') errors.logo_url = 'That logo link doesn’t look right.'

  const money = (k: 'budget_min_gbp' | 'budget_max_gbp' | 'deal_value_gbp') => {
    const v = parseMoney(b?.[k]); if (v === 'bad') { errors[k] = 'Use a number, like 25000 or £25k.'; return null } return v
  }
  const budgetMin = money('budget_min_gbp'), budgetMax = money('budget_max_gbp'), dealValue = money('deal_value_gbp')
  if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) errors.budget_max_gbp = 'Max is below min.'
  const clients = parseCount(b?.client_count, 100_000)
  if (clients === 'bad') errors.client_count = 'Use a whole number.'
  const reply = parseCount(b?.reply_hours_typical, 24 * 30)
  if (reply === 'bad') errors.reply_hours_typical = 'Hours, as a whole number.'

  const regions = [...new Set(arr<string>(b?.regions).filter(r => REGION_KEYS.includes(r)))]
  const sectors = [...new Set(arr<string>(b?.sectors).filter(s => SECTOR_KEYS.includes(s)))]
  const keywords = [...new Set(str(b?.keywords).split(',').map(k => k.trim().toLowerCase()).filter(Boolean).map(k => k.slice(0, 40)))].slice(0, 30)

  const services = arr<{ title?: string; description?: string; price?: string }>(b?.services)
    .map(s => ({ title: clip(s?.title, 120) ?? '', description: clip(s?.description, 600) ?? '', price: clip(s?.price, 60) ?? '' }))
    .filter(s => s.title).slice(0, 12)
  const faqs = arr<{ q?: string; a?: string }>(b?.faqs)
    .map(f => ({ q: clip(f?.q, 200) ?? '', a: clip(f?.a, 1200) ?? '' }))
    .filter(f => f.q && f.a).slice(0, 12)
  const features = arr<{ label?: string; value?: string }>(b?.features)
    .map(f => ({ label: clip(f?.label, 40) ?? '', value: clip(f?.value, 40) ?? '' }))
    .filter(f => f.label && f.value).slice(0, 5)

  const row: Record<string, unknown> = {
    name, slug, category, audience, status, is_active: status === 'live', trust_level: trust,
    website: website === 'bad' ? null : website, logo_url: logo === 'bad' ? null : logo,
    tagline: clip(b?.tagline, 140), description: clip(b?.description, 3000), our_take: clip(b?.our_take, 1500),
    offer_text: clip(b?.offer_text, 160), deal_terms: clip(b?.deal_terms, 600), deal_value_gbp: dealValue,
    base_location: clip(b?.base_location, 80), regions, sectors, keywords,
    budget_min_gbp: budgetMin, budget_max_gbp: budgetMax, price_from: clip(b?.price_from, 60),
    client_count: clients === 'bad' ? null : clients, reply_hours_typical: reply === 'bad' ? null : reply,
    services, faqs, features,
  }

  if (status === 'live') {
    const gaps = liveGaps(row, null)
    if (gaps.length) errors.status = `Before going live, add: ${gaps.join(', ')}.`
  }
  return { row, errors }
}

/** What a profile must have to go live. Contacts are counted separately (they live in their own table). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function liveGaps(p: any, contactCount: number | null): string[] {
  const g: string[] = []
  if (!str(p.tagline).trim()) g.push('a tagline')
  if (!str(p.description).trim()) g.push('a description')
  if (!arr(p.regions).length) g.push('where they work')
  if (contactCount === 0) g.push('a contact to brief')
  return g
}

/** Nice-to-haves that make a profile convert. Shown as "missing info", never blocks saving. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function profileGaps(p: any, contactCount: number): string[] {
  const g = liveGaps(p, contactCount)
  if (!str(p.our_take).trim()) g.push('our take')
  if (!str(p.offer_text).trim()) g.push('a member deal')
  if (!str(p.price_from).trim()) g.push('pricing')
  if (!arr(p.services).length) g.push('services')
  return g
}
