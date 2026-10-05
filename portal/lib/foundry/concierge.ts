import type { Partner, PartnerCategory } from '@/lib/supabase/types'

/**
 * The Foundry concierge — Slice 1 (demo) engine.
 *
 * This is the DETERMINISTIC provider: it parses the query with keyword/intent
 * heuristics and ranks real partner data, with templated "why this" reasons.
 * It runs client-side, needs no API key, and costs nothing — ideal for the
 * demo on the preview.
 *
 * When we go live, swap `runConcierge` for a model-backed provider (Claude
 * Haiku, or a free-tier model) with the SAME signature and return shape:
 * parse intent → retrieve the same real candidates → let the model write the
 * reasons grounded in those candidates. Nothing else in the UI changes.
 */

export interface ConciergeContext {
  brandName?: string | null
  role?: string
  category?: string | null
  location?: string | null
}

export interface ConciergeMatch {
  partner: Partner
  score: number // 0–100 fit
  reasons: string[] // the transparent "why this"
}

const CATEGORY_LABELS: Record<PartnerCategory, string> = {
  funding: 'funding',
  property: 'property & fit-out',
  legal: 'legal',
  accounting: 'accounting & tax',
  technology: 'technology',
  insurance: 'insurance',
  marketing: 'marketing',
  recruitment: 'recruitment & HR',
  other: 'specialist support',
}

// Natural-language → category. A model provider replaces this with real intent
// parsing; the rest of the pipeline (retrieve → rank → reason) is unchanged.
const CATEGORY_SYNONYMS: Record<PartnerCategory, string[]> = {
  funding: ['fund', 'funding', 'finance', 'financ', 'loan', 'lend', 'capital', 'money', 'invest', 'cash', 'raise'],
  property: ['property', 'site', 'premises', 'unit', 'fit-out', 'fitout', 'fit out', 'lease', 'shop', 'store', 'build'],
  legal: ['legal', 'lawyer', 'solicitor', 'agreement', 'contract', 'dispute', 'terms'],
  accounting: ['account', 'tax', 'bookkeep', 'payroll', 'vat'],
  technology: ['tech', 'epos', 'till', 'software', 'app', 'pos', 'system', 'data', 'website', 'ordering', 'digital'],
  insurance: ['insurance', 'insure', 'cover', 'liability', 'risk'],
  marketing: ['marketing', 'market', 'brand', 'advert', 'social', 'seo', 'ppc', 'campaign', 'launch', 'promo'],
  recruitment: ['recruit', 'hire', 'hiring', 'staff', 'people', 'manager', 'team'],
  other: [],
}

export interface ParsedQuery {
  categories: PartnerCategory[]
  terms: string[]
  wantsDeal: boolean
  expansion: boolean
  location: string | null
}

export function parseQuery(raw: string): ParsedQuery {
  const q = (raw || '').toLowerCase()
  const categories: PartnerCategory[] = []
  for (const [cat, words] of Object.entries(CATEGORY_SYNONYMS) as [PartnerCategory, string[]][]) {
    if (words.some(w => q.includes(w))) categories.push(cat)
  }
  const wantsDeal = /\b(deal|offer|discount|free|save|cheap)\b/.test(q)
  const expansion = /\b(expand|grow|scale|open|new site|another|more sites|second)\b/.test(q)
  const locMatch = q.match(/\b(?:in|near|around)\s+([a-z][a-z\s]{2,28})$/)
  const location = locMatch ? locMatch[1].trim() : null
  const terms = q.split(/[^a-z0-9]+/).filter(t => t.length > 2)
  return { categories, terms, wantsDeal, expansion, location }
}

function haystack(p: Partner): string {
  return [p.name, p.tagline, p.description, p.offer_text, p.location, p.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** Rank real partners against a natural-language ask, with reasons. */
export function runConcierge(
  raw: string,
  partners: Partner[],
  ctx: ConciergeContext = {},
  limit = 4,
): ConciergeMatch[] {
  const parsed = parseQuery(raw)
  const active = partners.filter(p => p.is_active)

  const scored: ConciergeMatch[] = active.map(p => {
    let score = 40 // base — it exists and it's vetted
    const reasons: string[] = []
    const t = haystack(p)

    if (parsed.categories.length) {
      if (parsed.categories.includes(p.category)) {
        score += 35
        reasons.push(`Matches what you asked for — ${CATEGORY_LABELS[p.category]}`)
      } else {
        score -= 16 // off-category: keep, but push down
      }
    }

    const hits = parsed.terms.filter(term => t.includes(term)).length
    if (hits) score += Math.min(hits * 5, 15)

    if (p.offer_text) {
      score += 6
      reasons.push(`Foundry deal — ${p.offer_text}`)
    }

    if (parsed.location && p.location && p.location.toLowerCase().includes(parsed.location)) {
      score += 8
      reasons.push(`Based near ${p.location}`)
    }

    if (parsed.expansion && (p.category === 'funding' || p.category === 'property')) {
      score += 7
      if (reasons.length < 2) reasons.push('Suited to opening new sites')
    }

    reasons.push('Vetted by Franchise Foundry · used across the network')

    return {
      partner: p,
      score: Math.max(8, Math.min(99, Math.round(score))),
      reasons: reasons.slice(0, 3),
    }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Proactive picks for the signed-in member before they ask anything. */
export function forgedForYou(partners: Partner[], _ctx: ConciergeContext = {}, limit = 3): ConciergeMatch[] {
  const active = partners.filter(p => p.is_active)
  const scored: ConciergeMatch[] = active.map(p => {
    let score = 55
    const reasons: string[] = []
    if (p.offer_text) {
      score += 12
      reasons.push(`Foundry deal — ${p.offer_text}`)
    }
    reasons.push('Popular with brands across the network')
    return { partner: p, score: Math.min(99, score), reasons: reasons.slice(0, 2) }
  })
  return scored
    .sort((a, b) => b.score - a.score || a.partner.display_order - b.partner.display_order)
    .slice(0, limit)
}
