import type { FranchiseeProfile, FranchisorProfile } from './supabase/types'

const EXPERIENCE_ORDER: Record<string, number> = {
  none: 0,
  management: 1,
  'food-beverage': 2,
}

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
export function scoreMatch(
  franchisee: FranchiseeProfile,
  franchisor: FranchisorProfile
): number {

  // ── Hard filter: total budget ────────────────────────────────────────────
  if (franchisee.investment_max && franchisor.investment_min) {
    if (franchisee.investment_max < franchisor.investment_min) return 0
  }

  // ── Hard filter: liquid capital ──────────────────────────────────────────
  if (franchisee.liquid_capital != null && franchisor.liquid_capital_min) {
    if (franchisee.liquid_capital < franchisor.liquid_capital_min) return 0
  }

  // ── Hard filter: location ────────────────────────────────────────────────
  if (franchisee.preferred_locations?.length && franchisor.locations_available?.length) {
    const hasOverlap = franchisee.preferred_locations.some(loc =>
      franchisor.locations_available.includes(loc)
    )
    if (!hasOverlap) return 0
  }

  // ── Hard filter: multi-site requirement ─────────────────────────────────
  if (franchisor.min_sites_required && franchisor.min_sites_required >= 2) {
    if (!franchisee.multi_site_interest) return 0
  }

  let score = 0

  // ── 1. Experience — 20 pts ───────────────────────────────────────────────
  // Most important hard requirement: brands that won't take first-timers
  // should never be shown at the top for someone with no background.
  if (franchisee.experience && franchisor.experience_required) {
    const franchiseeLevel = EXPERIENCE_ORDER[franchisee.experience] ?? 0
    const requiredLevel = EXPERIENCE_ORDER[franchisor.experience_required] ?? 0
    if (franchiseeLevel >= requiredLevel) {
      score += 20
    } else {
      // Partial credit for being one level below (management vs food-beverage)
      score += franchiseeLevel > 0 && requiredLevel - franchiseeLevel === 1 ? 8 : 0
    }
  } else if (!franchisor.experience_required) {
    score += 20
  }

  // ── 2. Budget fit — 20 pts ───────────────────────────────────────────────
  // Checks both affordability AND whether this is the right investment level.
  // A £1m investor in a £25k brand is as poor a fit as someone who can't afford it.
  if (franchisee.investment_max && franchisor.investment_min) {
    const brandMax = franchisor.investment_max ?? null
    const franchiseeMin = franchisee.investment_min ?? 0

    if (brandMax && franchiseeMin > brandMax) {
      // Franchisee's minimum exceeds what the brand costs — overqualified
      score += 4
    } else {
      const headroom = (franchisee.investment_max - franchisor.investment_min) / franchisor.investment_min
      if (headroom >= 0.5)      score += 20  // comfortable: max is 50%+ above brand min
      else if (headroom >= 0.2) score += 13  // workable: 20–50% buffer
      else                      score += 7   // tight: barely covers the minimum
    }
  } else if (!franchisor.investment_min) {
    score += 12 // brand has no stated minimum — neutral
  }

  // ── 3. Operator model — 15 pts ───────────────────────────────────────────
  if (franchisee.operator_model && franchisor.operator_model) {
    if (
      franchisor.operator_model === 'either' ||
      franchisee.operator_model === 'either' ||
      franchisee.operator_model === franchisor.operator_model
    ) {
      score += 15
    }
    // Mismatch: 0 pts
  }

  // ── 4. Timeline alignment — 15 pts ──────────────────────────────────────
  // Someone who wants to open in 3 months should not top-match with a brand
  // that takes 27 months to get running.
  if (franchisee.timeline_months && franchisor.timeline_months) {
    const ratio = franchisee.timeline_months / franchisor.timeline_months
    if (ratio >= 1) {
      score += 15 // franchisee has as much time as the brand needs — ideal
    } else if (ratio >= 0.6) {
      score += 8  // a bit impatient but close enough
    } else {
      score += 3  // franchisee wants to move much faster than the brand allows
    }
  } else if (!franchisor.timeline_months) {
    score += 10 // brand has no stated timeline — neutral
  }

  // ── 5. Format type — 10 pts ──────────────────────────────────────────────
  // Matches franchisee's preferred site format against what the brand offers.
  if (franchisee.format_types?.length && franchisor.format?.length) {
    const noPreference = franchisee.format_types.includes('flexible')
    if (noPreference) {
      score += 7 // open to anything — neutral-positive
    } else {
      const hasFormatMatch = franchisee.format_types.some(fmt =>
        franchisor.format.includes(fmt) || franchisor.format.includes('flexible')
      )
      score += hasFormatMatch ? 10 : 0
    }
  } else if (!franchisor.format?.length || !franchisee.format_types?.length) {
    score += 6 // one side has no preference — neutral
  }

  // ── 6. Location quality — 10 pts ─────────────────────────────────────────
  // Hard filter already eliminated zero-overlap cases above.
  // Here we reward quality of location match.
  if (franchisee.preferred_locations?.length) {
    if (franchisor.locations_available?.length) {
      score += 10 // specific city match confirmed
    } else {
      score += 6  // brand has no location restriction (national / international)
    }
  } else {
    score += 6 // no location preference — neutral
  }

  // ── 7. Full-time availability — 5 pts ────────────────────────────────────
  if (franchisee.full_time_available !== null && franchisee.full_time_available !== undefined) {
    if (!franchisor.full_time_required || franchisee.full_time_available) {
      score += 5
    }
    // Brand requires full-time but franchisee can't commit → 0 pts
  }

  // ── 8. Multi-site alignment — 5 pts ─────────────────────────────────────
  if (franchisee.multi_site_interest && franchisor.multi_site_ready) {
    score += 5
  }

  return score
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
