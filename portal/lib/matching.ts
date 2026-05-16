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
  // Hard filter: budget (franchisee can't afford the minimum)
  if (franchisee.investment_max && franchisor.investment_min) {
    if (franchisee.investment_max < franchisor.investment_min) return 0
  }

  // Hard filter: location overlap (only when both sides have data)
  if (franchisee.preferred_locations?.length && franchisor.locations_available?.length) {
    const hasOverlap = franchisee.preferred_locations.some(loc =>
      franchisor.locations_available.includes(loc)
    )
    if (!hasOverlap) return 0
  }

  let score = 0

  // Investment fit — 30 pts
  // Rewards how comfortably the franchisee's budget covers the brand's cost.
  // This is the main differentiator since all brands are food-beverage.
  if (franchisee.investment_max && franchisor.investment_min) {
    const headroom = (franchisee.investment_max - franchisor.investment_min) / franchisor.investment_min
    if (headroom >= 0.3) {
      score += 30 // comfortable — franchisee budget is at least 30% above minimum
    } else {
      score += 15 // tight — franchisee can technically afford it but no buffer
    }
  } else if (!franchisor.investment_min) {
    score += 20 // brand has no stated minimum — neutral
  }

  // Operator model — 25 pts
  if (franchisee.operator_model && franchisor.operator_model) {
    if (
      franchisor.operator_model === 'either' ||
      franchisee.operator_model === 'either' ||
      franchisee.operator_model === franchisor.operator_model
    ) {
      score += 25
    }
  }

  // Full-time availability — 20 pts
  // 20 pts when the franchisee meets (or exceeds) the brand's requirement.
  if (franchisee.full_time_available !== null && franchisee.full_time_available !== undefined) {
    if (!franchisor.full_time_required || franchisee.full_time_available) {
      score += 20
    }
  }

  // Experience — 15 pts
  if (franchisee.experience && franchisor.experience_required) {
    const franchiseeLevel = EXPERIENCE_ORDER[franchisee.experience] ?? 0
    const requiredLevel = EXPERIENCE_ORDER[franchisor.experience_required] ?? 0
    if (franchiseeLevel >= requiredLevel) score += 15
  } else if (!franchisor.experience_required) {
    score += 15 // brand requires no experience — everyone qualifies
  }

  // Multi-site interest — 10 pts bonus
  if (franchisee.multi_site_interest && franchisor.multi_site_ready) {
    score += 10
  }

  return score
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent match'
  if (score >= 70) return 'Strong match'
  if (score >= 55) return 'Good match'
  if (score >= 40) return 'Potential match'
  return 'Partial match'
}

export function scoreColour(score: number): string {
  if (score >= 85) return 'text-emerald-700 bg-emerald-50'
  if (score >= 70) return 'text-brand-green bg-green-50'
  if (score >= 55) return 'text-amber-700 bg-amber-50'
  return 'text-slate-600 bg-slate-100'
}
