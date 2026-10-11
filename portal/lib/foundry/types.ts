import type { Need, Region, Stage } from './taxonomy.ts'

export type Audience = 'franchisee' | 'franchisor' | 'both'
export type TrustLevel = 'listed' | 'trusted' | 'recommended'

/** What we understood from the words typed. Every field is optional. */
export interface ParsedQuery {
  raw: string
  needs: Need[]
  /** The word that triggered each need, for the query chip ("need accountant"). */
  needTerms: Partial<Record<Need, string>>
  sector: { key: string; label: string } | null
  area: { label: string; region: Region } | null
  budget: number | null
  stage: Stage | null
}

/**
 * The member's plan, applied to every search unless they switch a chip off.
 * Built server side from their profile; never trusted from the client.
 */
export interface PlanContext {
  brand?: string | null
  sector?: { key: string; label: string } | null
  area?: { label: string; region: Region } | null
  budget?: number | null
  stage?: Stage | null
  /** Which partners this person should see. 'any' for website visitors. */
  audience: 'franchisee' | 'franchisor' | 'any'
}

/** The partner fields the engine needs. Public fields only. */
export interface EnginePartner {
  id: string
  slug: string
  name: string
  category: string
  audience: Audience
  tagline: string | null
  offer_text: string | null
  trust_level: TrustLevel
  regions: string[]
  base_location: string | null
  price_from: string | null
  budget_min_gbp: number | null
  budget_max_gbp: number | null
  sectors: string[]
  keywords: string[]
  client_count: number | null
  reply_hours: number | null
}

export type FitLabel = 'Strong fit' | 'Good fit' | 'Possible fit'

export interface ScoredPartner {
  id: string
  slug: string
  name: string
  category: string
  categoryLabel: string
  tagline: string | null
  trust: TrustLevel
  deal: string | null
  fit: number
  label: FitLabel
  why: string[]
  facts: string[]
}

export interface ResultGroup {
  need: Need
  label: string
  title: string
  sub: string
  items: ScoredPartner[]
}

export interface SearchGap {
  need: Need
  label: string
  area: string | null
  message: string
}

export interface SearchResult {
  understood: ParsedQuery
  /** What was actually applied after merging the query with the plan. */
  applied: { sector: string | null; area: string | null; budget: number | null; stage: Stage | null }
  summary: string
  meta: string
  groups: ResultGroup[]
  alsoNeed: ScoredPartner[]
  gaps: SearchGap[]
  partnerIds: string[]
  unmetNeeds: Need[]
}
