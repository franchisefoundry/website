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
 *   Budget fit       25  — range overlap + overqualification penalty
 *   Operator model   20  — binary match
 *   Timeline         15  — how well franchisee's urgency fits brand's lead time
 *   Experience       15  — franchisee meets/exceeds requirement
 *   Location quality 10  — soft score: specific city match vs national vs unknown
 *   Full-time        10  — franchisee meets brand's commitment requirement
 *   Multi-site        5  — both sides interested in growth
 *
 * Two hard filters (return 0 immediately):
 *   - Franchisee cannot afford the brand's minimum investment
 *   - Franchisee wants a location the brand doesn't operate in
 */
export function scoreMatch(
  franchisee: FranchiseeProfile,
  franchisor: FranchisorProfile
): number {

  // ── Hard filter: budget ──────────────────────────────────────────────────
  if (franchisee.investment_max && franchisor.investment_min) {
    if (franchisee.investment_max < franchisor.investment_min) return 0
  }

  // ── Hard filter: location ────────────────────────────────────────────────
  if (franchisee.preferred_locations?.length && franchisor.locations_available?.length) {
    const hasOverlap = franchisee.preferred_locations.some(loc =>
      franchisor.locations_available.includes(loc)
    )
    if (!hasOverlap) return 0
  }

  let score = 0

  // ── 1. Budget fit — 25 pts ───────────────────────────────────────────────
  // Checks both affordability AND whether this is the right investment level.
  // A £1m investor in a £25k brand is as poor a fit as someone who can't afford it.
  if (franchisee.investment_max && franchisor.investment_min) {
    const brandMax = franchisor.investment_max ?? null
    const franchiseeMin = franchisee.investment_min ?? 0

    if (brandMax && franchiseeMin > brandMax) {
      // Franchisee's minimum exceeds what the brand costs — they're overqualified.
      score += 5
    } else {
      const headroom = (franchisee.investment_max - franchisor.investment_min) / franchisor.investment_min
      if (headroom >= 0.5)      score += 25  // comfortable: max is 50%+ above brand min
      else if (headroom >= 0.2) score += 17  // workable: 20–50% buffer
      else                      score += 10  // tight: barely covers the minimum
    }
  } else if (!franchisor.investment_min) {
    score += 15 // brand has no stated minimum — neutral
  }

  // ── 2. Operator model — 20 pts ───────────────────────────────────────────
  if (franchisee.operator_model && franchisor.operator_model) {
    if (
      franchisor.operator_model === 'either' ||
      franchisee.operator_model === 'either' ||
      franchisee.operator_model === franchisor.operator_model
    ) {
      score += 20
    }
    // Mismatch: 0 pts (e.g. wants hands-on, brand needs absentee manager)
  }

  // ── 3. Timeline alignment — 15 pts ──────────────────────────────────────
  // Compares how soon the franchisee wants to open vs how long the brand takes.
  // Someone who wants to open in 3 months should not be matched with a brand
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

  // ── 4. Experience — 15 pts ───────────────────────────────────────────────
  if (franchisee.experience && franchisor.experience_required) {
    const franchiseeLevel = EXPERIENCE_ORDER[franchisee.experience] ?? 0
    const requiredLevel = EXPERIENCE_ORDER[franchisor.experience_required] ?? 0
    if (franchiseeLevel >= requiredLevel) score += 15
  } else if (!franchisor.experience_required) {
    score += 15
  }

  // ── 5. Location quality — 10 pts ─────────────────────────────────────────
  // Hard filter already eliminated zero-overlap cases above.
  // Here we reward quality of location match.
  if (franchisee.preferred_locations?.length) {
    if (franchisor.locations_available?.length) {
      // Specific city match confirmed (passed hard filter)
      score += 10
    } else {
      // Brand has no location restriction (national / international)
      score += 6
    }
  } else {
    // No location preference — neutral
    score += 6
  }

  // ── 6. Full-time availability — 10 pts ───────────────────────────────────
  if (franchisee.full_time_available !== null && franchisee.full_time_available !== undefined) {
    if (!franchisor.full_time_required || franchisee.full_time_available) {
      score += 10
    }
    // Brand requires full-time but franchisee can't commit → 0 pts
  }

  // ── 7. Multi-site alignment — 5 pts ─────────────────────────────────────
  if (franchisee.multi_site_interest && franchisor.multi_site_ready) {
    score += 5
  }

  return score
}

export function scoreLabel(score: number): string {
  if (score >= 88) return 'Excellent match'
  if (score >= 72) return 'Strong match'
  if (score >= 55) return 'Good match'
  if (score >= 38) return 'Potential match'
  return 'Partial match'
}

export function scoreColour(score: number): string {
  if (score >= 88) return 'text-emerald-700 bg-emerald-50'
  if (score >= 72) return 'text-brand-green bg-green-50'
  if (score >= 55) return 'text-amber-700 bg-amber-50'
  return 'text-slate-600 bg-slate-100'
}
