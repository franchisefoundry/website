/**
 * Profile completeness for admin views: which fields a franchisee or brand
 * still hasn't filled in. Shared by the record pages, drawers and list views so
 * the percentage means the same thing everywhere.
 */

export interface Completeness {
  pct: number
  missing: string[]
}

type Check = [label: string, done: boolean]

const has = (v: unknown) =>
  v != null && v !== '' && !(Array.isArray(v) && v.length === 0)

function score(checks: Check[]): Completeness {
  const done = checks.filter(([, ok]) => ok).length
  return {
    pct: checks.length ? Math.round((done / checks.length) * 100) : 100,
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export function franchiseeCompleteness(fe: Row, profile: Row | null | undefined): Completeness {
  return score([
    ['Name', has(profile?.full_name)],
    ['Phone number', has(profile?.phone)],
    ['Investment budget', has(fe.investment_min) || has(fe.investment_max)],
    ['Liquid capital', has(fe.liquid_capital)],
    ['Preferred locations', has(fe.preferred_locations)],
    ['Sectors', has(fe.sectors)],
    ['Format preferences', has(fe.format_types)],
    ['Operator model', has(fe.operator_model)],
    ['Experience', has(fe.experience)],
    ['Full-time availability', fe.full_time_available != null],
    ['Timeline', has(fe.timeline_months)],
    ['Goals', has(fe.goals)],
  ])
}

export function brandCompleteness(
  b: Row,
  extra: { hasLogin?: boolean; questionnaireDone?: boolean } = {},
): Completeness {
  const checks: Check[] = [
    ['Brand name', has(b.brand_name)],
    ['Logo', has(b.logo_url)],
    ['Category', has(b.category)],
    ['Teaser', has(b.teaser)],
    ['Highlights', has(b.highlights)],
    ['Investment range', has(b.investment_min) || has(b.investment_max)],
    ['Liquid capital minimum', has(b.liquid_capital_min)],
    ['Franchise fee', has(b.franchise_fee)],
    ['Royalty %', has(b.royalty_pct)],
    ['Locations available', has(b.locations_available) || has(b.locations_display)],
    ['Operator model', has(b.operator_model)],
    ['Formats', has(b.format)],
    ['Contact name', has(b.contact_name)],
    ['Contact email', has(b.contact_email)],
  ]
  if (extra.hasLogin !== undefined) checks.push(['Portal login (invite sent)', extra.hasLogin])
  if (extra.questionnaireDone !== undefined) checks.push(['Onboarding questionnaire', extra.questionnaireDone])
  return score(checks)
}
