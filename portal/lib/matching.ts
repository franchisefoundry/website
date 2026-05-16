import type { FranchiseeProfile, FranchisorProfile } from './supabase/types'

const EXPERIENCE_ORDER: Record<string, number> = {
  none: 0,
  management: 1,
  'food-beverage': 2,
}

export function scoreMatch(
  franchisee: FranchiseeProfile,
  franchisor: FranchisorProfile
): number {
  // Hard filter: budget — franchisee cannot afford the brand at all
  if (franchisee.investment_max && franchisor.investment_min) {
    if (franchisee.investment_max < franchisor.investment_min) return 0
  }

  // Hard filter: location — only when both sides have specific data
  if (franchisee.preferred_locations?.length && franchisor.locations_available?.length) {
    const hasOverlap = franchisee.preferred_locations.some(loc =>
      franchisor.locations_available.includes(loc)
    )
    if (!hasOverlap) return 0
  }

  let score = 0

  // ── Investment fit — 30 pts ─────────────────────────────────────────────
  // Checks BOTH directions: can they afford it AND is it appropriate for their
  // investment level? A £1m investor in a £25k brand is a poor fit.
  if (franchisee.investment_max && franchisor.investment_min) {
    const brandMax = franchisor.investment_max ?? null
    const franchiseeMin = franchisee.investment_min ?? 0

    if (brandMax && franchiseeMin > brandMax) {
      // Franchisee's minimum is above the brand's maximum cost — overqualified.
      // They could invest here, but it's well below their range.
      score += 8
    } else {
      // Budget overlaps the brand's range — reward how comfortable the fit is.
      const headroom = (franchisee.investment_max - franchisor.investment_min) / franchisor.investment_min
      if (headroom >= 0.5) score += 30      // comfortable — 50%+ above minimum
      else if (headroom >= 0.15) score += 20 // workable — 15–50% above minimum
      else score += 12                        // very tight — just barely affordable
    }
  } else if (!franchisor.investment_min) {
    score += 18 // brand has no stated minimum; neutral score
  }

  // ── Operator model — 25 pts ─────────────────────────────────────────────
  if (franchisee.operator_model && franchisor.operator_model) {
    if (
      franchisor.operator_model === 'either' ||
      franchisee.operator_model === 'either' ||
      franchisee.operator_model === franchisor.operator_model
    ) {
      score += 25
    }
    // Mismatch (e.g. wants owner-op, brand needs hire-manager) → 0 pts
  }

  // ── Full-time availability — 20 pts ─────────────────────────────────────
  if (franchisee.full_time_available !== null && franchisee.full_time_available !== undefined) {
    if (!franchisor.full_time_required || franchisee.full_time_available) {
      score += 20
    }
    // Brand requires full-time but franchisee can't commit → 0 pts
  }

  // ── Experience — 15 pts ──────────────────────────────────────────────────
  if (franchisee.experience && franchisor.experience_required) {
    const franchiseeLevel = EXPERIENCE_ORDER[franchisee.experience] ?? 0
    const requiredLevel = EXPERIENCE_ORDER[franchisor.experience_required] ?? 0
    if (franchiseeLevel >= requiredLevel) score += 15
  } else if (!franchisor.experience_required) {
    score += 15 // brand has no experience requirement — everyone qualifies
  }

  // ── Multi-site alignment — 10 pts ───────────────────────────────────────
  if (franchisee.multi_site_interest && franchisor.multi_site_ready) {
    score += 10
  }

  return score
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Excellent match'
  if (score >= 75) return 'Strong match'
  if (score >= 58) return 'Good match'
  if (score >= 40) return 'Potential match'
  return 'Partial match'
}

export function scoreColour(score: number): string {
  if (score >= 90) return 'text-emerald-700 bg-emerald-50'
  if (score >= 75) return 'text-brand-green bg-green-50'
  if (score >= 58) return 'text-amber-700 bg-amber-50'
  return 'text-slate-600 bg-slate-100'
}
