import type { FranchiseeProfile, FranchisorProfile } from './supabase/types'

const EXPERIENCE_ORDER: Record<string, number> = {
  none: 0,
  management: 1,
  'food-beverage': 2,
}

/** Tunable weight per matching dimension (should total ~100). */
export interface MatchWeights {
  experience: number
  budget: number
  operator: number
  timeline: number
  format: number
  location: number
  full_time: number
  multi_site: number
}

export const DEFAULT_WEIGHTS: MatchWeights = {
  experience: 20, budget: 20, operator: 15, timeline: 15,
  format: 10, location: 10, full_time: 5, multi_site: 5,
}

const R = Math.round

/**
 * Score a franchisee against a franchisor. Max = 100.
 *
 * Dimensions (total 100):
 *   Experience       20  — franchisee meets/exceeds requirement
 *   Budget fit       20  — range overlap + overqualification penalty
 *   Operator model   15  — binary match
 *   Timeline         15  — how well franchisee's urgency fits brand's lead time
 *   Format type      10  — preferred site format overlap
 *   Location quality 10  — soft score: specific city match vs national vs unknown
 *   Full-time         5  — franchisee meets brand's commitment requirement
 *   Multi-site        5  — both sides interested in growth
 *
 * Hard filters (return 0 immediately):
 *   - Franchisee cannot afford the brand's minimum investment
 *   - Franchisee's liquid capital is below brand's minimum requirement
 *   - Franchisee wants a location the brand doesn't operate in
 *   - Brand requires multi-site but franchisee only wants a single site
 */
/**
 * Scores a match AND explains it — the reasons power the "why they match" chips
 * in the CRM. A reason is only added when a dimension genuinely contributes
 * (a real, confirmed overlap), so the chips reflect actual fit, not filler.
 */
export function scoreMatchDetailed(
  franchisee: FranchiseeProfile,
  franchisor: FranchisorProfile,
  w: MatchWeights = DEFAULT_WEIGHTS,
): { score: number; reasons: string[] } {
  const reasons: string[] = []

  // ── Hard filters (return 0 immediately) ──────────────────────────────────
  if (franchisee.investment_max && franchisor.investment_min && franchisee.investment_max < franchisor.investment_min) return { score: 0, reasons: [] }
  if (franchisee.liquid_capital != null && franchisor.liquid_capital_min && franchisee.liquid_capital < franchisor.liquid_capital_min) return { score: 0, reasons: [] }
  if (franchisee.preferred_locations?.length && franchisor.locations_available?.length) {
    if (!franchisee.preferred_locations.some(loc => franchisor.locations_available.includes(loc))) return { score: 0, reasons: [] }
  }
  if (franchisor.min_sites_required && franchisor.min_sites_required >= 2 && !franchisee.multi_site_interest) return { score: 0, reasons: [] }

  let score = 0

  // 1. Experience — full weight when the requirement is met.
  if (franchisee.experience && franchisor.experience_required) {
    const fl = EXPERIENCE_ORDER[franchisee.experience] ?? 0
    const rl = EXPERIENCE_ORDER[franchisor.experience_required] ?? 0
    if (fl >= rl) { score += w.experience; reasons.push('Experience fits') }
    else if (fl > 0 && rl - fl === 1) { score += R(w.experience * 0.4) }
  } else if (!franchisor.experience_required) {
    score += w.experience; reasons.push('Open to all backgrounds')
  }

  // 2. Budget fit
  if (franchisee.investment_max && franchisor.investment_min) {
    const brandMax = franchisor.investment_max ?? null
    const franchiseeMin = franchisee.investment_min ?? 0
    if (brandMax && franchiseeMin > brandMax) { score += R(w.budget * 0.2) }
    else {
      const headroom = (franchisee.investment_max - franchisor.investment_min) / franchisor.investment_min
      if (headroom >= 0.5) { score += w.budget; reasons.push('Budget aligned') }
      else if (headroom >= 0.2) { score += R(w.budget * 0.65); reasons.push('Budget covers it') }
      else { score += R(w.budget * 0.35) }
    }
  } else if (!franchisor.investment_min) { score += R(w.budget * 0.6) }

  // 3. Operator model
  if (franchisee.operator_model && franchisor.operator_model) {
    if (franchisor.operator_model === 'either' || franchisee.operator_model === 'either' || franchisee.operator_model === franchisor.operator_model) {
      score += w.operator; reasons.push('Operator model matches')
    }
  }

  // 4. Timeline
  if (franchisee.timeline_months && franchisor.timeline_months) {
    const ratio = franchisee.timeline_months / franchisor.timeline_months
    if (ratio >= 1) { score += w.timeline; reasons.push('Timeline fits') }
    else if (ratio >= 0.6) { score += R(w.timeline * 0.53) }
    else { score += R(w.timeline * 0.2) }
  } else if (!franchisor.timeline_months) { score += R(w.timeline * 0.67) }

  // 5. Format
  if (franchisee.format_types?.length && franchisor.format?.length) {
    if (franchisee.format_types.includes('flexible')) { score += R(w.format * 0.7) }
    else if (franchisee.format_types.some(fmt => franchisor.format.includes(fmt) || franchisor.format.includes('flexible'))) {
      score += w.format; reasons.push('Format matches')
    }
  } else if (!franchisor.format?.length || !franchisee.format_types?.length) { score += R(w.format * 0.6) }

  // 6. Location
  if (franchisee.preferred_locations?.length) {
    if (franchisor.locations_available?.length) { score += w.location; reasons.push(`Territory available${franchisee.preferred_locations[0] ? ` — ${franchisee.preferred_locations[0]}` : ''}`) }
    else { score += R(w.location * 0.6) }
  } else { score += R(w.location * 0.6) }

  // 7. Full-time
  if (franchisee.full_time_available != null) {
    if (!franchisor.full_time_required || franchisee.full_time_available) score += w.full_time
  }

  // 8. Multi-site
  if (franchisee.multi_site_interest && franchisor.multi_site_ready) { score += w.multi_site; reasons.push('Both open to multi-site') }

  return { score, reasons }
}

export function scoreMatch(franchisee: FranchiseeProfile, franchisor: FranchisorProfile, w?: MatchWeights): number {
  return scoreMatchDetailed(franchisee, franchisor, w).score
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent match'
  if (score >= 70) return 'Strong match'
  if (score >= 52) return 'Good match'
  if (score >= 35) return 'Potential match'
  return 'Partial match'
}

export function scoreColour(score: number): string {
  if (score >= 85) return 'text-emerald-700 bg-emerald-50'
  if (score >= 70) return 'text-brand-green bg-green-50'
  if (score >= 52) return 'text-amber-700 bg-amber-50'
  return 'text-slate-600 bg-slate-100'
}
