/**
 * Ranking for Foundry Search. Fit only: category, area, budget, sector
 * experience and reply time. Deals, trust level and anything commercial are
 * shown, never scored, so payment can never change the order.
 */
import {
  NEED_LABEL, NEED_PHRASE, ALSO_NEED, ALSO_WHY, STAGE_STARTERS,
  type Need,
} from './taxonomy.ts'
import { parseQuery, formatBudget } from './parse.ts'
import type {
  EnginePartner, ParsedQuery, PlanContext, ScoredPartner, SearchResult, ResultGroup, SearchGap, FitLabel,
} from './types.ts'

const MAX_WHY = 3

interface Applied {
  sector: ParsedQuery['sector']
  area: ParsedQuery['area']
  budget: number | null
}

export function search(parsed: ParsedQuery, partners: EnginePartner[], ctx: PlanContext): SearchResult {
  // The query beats the plan; the plan fills what the query didn't say.
  const applied: Applied = {
    sector: parsed.sector ?? ctx.sector ?? null,
    area: parsed.area ?? ctx.area ?? null,
    budget: parsed.budget ?? ctx.budget ?? null,
  }
  const stage = parsed.stage ?? ctx.stage ?? null

  const visible = partners.filter(p => audienceMatches(p, ctx.audience))
  const byNeed = (need: Need) => visible.filter(p => p.category === need)

  const groups: ResultGroup[] = []
  const gaps: SearchGap[] = []
  for (const need of parsed.needs) {
    const all = byNeed(need)
    const items = all
      .map(p => score(p, need, applied, parsed.raw))
      .filter((s): s is ScoredPartner => s !== null)
      .sort(byFit)
    if (items.length) {
      groups.push({
        need,
        label: NEED_LABEL[need],
        title: `${NEED_LABEL[need].toUpperCase()} · BEST MATCH`,
        sub: `${items.length} of ${all.length} ${NEED_LABEL[need].toLowerCase()} partner${all.length === 1 ? '' : 's'}`,
        items,
      })
    } else {
      gaps.push(gapFor(need, applied.area?.label ?? null))
    }
  }

  const alsoNeed = followOns(parsed.needs, stage)
    .map(need => {
      const best = byNeed(need).map(p => score(p, need, applied, parsed.raw)).filter(Boolean).sort(byFit)[0]
      return best ? { ...best, why: [ALSO_WHY[need]] } : null
    })
    .filter((s): s is ScoredPartner => s !== null)
    .slice(0, parsed.needs.length ? 2 : 3)

  const shown = [...groups.flatMap(g => g.items), ...alsoNeed]
  return {
    understood: parsed,
    applied: {
      sector: applied.sector?.label ?? null,
      area: applied.area?.label ?? null,
      budget: applied.budget,
      stage,
    },
    summary: summarise(parsed.needs, groups, gaps),
    meta: `Read ${parsed.needs.length} need${parsed.needs.length === 1 ? '' : 's'} · searched ${visible.length} vetted partner${visible.length === 1 ? '' : 's'} · ${shown.length} relevant`,
    groups,
    alsoNeed,
    gaps,
    partnerIds: shown.map(s => s.id),
    unmetNeeds: gaps.map(g => g.need),
  }
}

/** Convenience: parse then rank. */
export function searchText(q: string, partners: EnginePartner[], ctx: PlanContext): SearchResult {
  return search(parseQuery(q), partners, ctx)
}

function audienceMatches(p: EnginePartner, audience: PlanContext['audience']) {
  if (audience === 'any') return true
  return p.audience === 'both' || p.audience === audience
}

/** Score one partner for one need. null = can't serve this person (outside their area). */
export function score(p: EnginePartner, need: Need, applied: Applied, raw: string): ScoredPartner | null {
  let fit = 55
  const why: string[] = []

  if (applied.area) {
    const ukWide = p.regions.includes('uk')
    const covers = ukWide || p.regions.includes(applied.area.region)
    if (!covers) return null
    fit += 15
    const baseRegion = p.base_location ? parseQuery(p.base_location).area?.region : null
    if (baseRegion === applied.area.region) {
      fit += 5
      why.push(p.base_location === applied.area.label
        ? `Based in ${p.base_location}`
        : `Based in ${p.base_location}, covers ${applied.area.label}`)
    } else {
      why.push(ukWide ? `Works UK-wide, including ${applied.area.label}` : `Covers ${applied.area.label}`)
    }
  } else {
    fit += 5
  }

  if (applied.budget && p.budget_min_gbp != null && p.budget_max_gbp != null) {
    const inside = applied.budget >= p.budget_min_gbp && applied.budget <= p.budget_max_gbp
    if (inside) {
      fit += 12
      why.unshift(`${formatBudget(applied.budget)} sits inside their ${formatBudget(p.budget_min_gbp)}–${formatBudget(p.budget_max_gbp)} range`)
    } else {
      fit -= 15
    }
  }

  if (applied.sector && p.sectors.includes(applied.sector.key)) {
    fit += 8
    why.push(`Knows ${applied.sector.label} franchises`)
  }

  const q = raw.toLowerCase()
  if (p.keywords.some(k => k && new RegExp(`\\b${escapeRe(k.toLowerCase())}\\b`).test(q))) fit += 4

  if (p.reply_hours != null) {
    if (p.reply_hours <= 8) { fit += 4; why.push(`Usually replies within ${p.reply_hours} hours`) }
    else if (p.reply_hours <= 24) fit += 1
  }
  if (p.client_count != null && p.client_count >= 30) fit += 2

  if (!why.length && p.tagline) why.push(p.tagline)
  fit = Math.max(1, Math.min(98, fit))

  const facts: string[] = []
  if (p.price_from) facts.push(p.price_from)
  if (p.reply_hours != null) facts.push(`replies ~${p.reply_hours}h`)
  if (p.client_count) facts.push(`${p.client_count} franchise clients`)

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: need,
    categoryLabel: NEED_LABEL[need],
    tagline: p.tagline,
    trust: p.trust_level,
    deal: p.offer_text,
    fit,
    label: fitLabel(fit),
    why: why.slice(0, MAX_WHY),
    facts,
  }
}

function fitLabel(fit: number): FitLabel {
  if (fit >= 85) return 'Strong fit'
  if (fit >= 70) return 'Good fit'
  return 'Possible fit'
}

function byFit(a: ScoredPartner | null, b: ScoredPartner | null) {
  if (!a || !b) return 0
  return b.fit - a.fit || a.name.localeCompare(b.name)
}

function followOns(needs: Need[], stage: SearchResult['applied']['stage']): Need[] {
  const pool = needs.length ? needs.flatMap(n => ALSO_NEED[n]) : STAGE_STARTERS[stage ?? 'unknown']
  return [...new Set(pool)].filter(n => !needs.includes(n))
}

const GAP_NOUN: Record<Need, string> = {
  funding: 'funding', property: 'property', legal: 'legal', accounting: 'accounting',
  technology: 'tech', insurance: 'insurance', marketing: 'marketing', recruitment: 'recruitment',
}

function gapFor(need: Need, area: string | null): SearchGap {
  return {
    need,
    label: NEED_LABEL[need],
    area,
    message: area ? `No ${GAP_NOUN[need]} partner in ${area} yet.` : `No ${GAP_NOUN[need]} partner yet.`,
  }
}

function summarise(needs: Need[], groups: ResultGroup[], gaps: SearchGap[]): string {
  if (!needs.length) {
    return 'Tell us what you need and we’ll match you. In the meantime, here’s who franchisees usually line up first.'
  }
  const parts = [`You need ${list(needs.map(n => NEED_PHRASE[n]))}.`]
  const picks = groups.map(g => g.items[0])
  if (picks.length) {
    const names = list(picks.map(p => p.name))
    const withDeal = picks.filter(p => p.deal)
    let deal = ''
    if (withDeal.length && withDeal.length === picks.length) {
      deal = picks.length === 1 ? ', and it comes with a member deal' : picks.length === 2 ? ', and both come with a member deal' : ', and all of them come with a member deal'
    } else if (withDeal.length === 1 && picks.length > 1) {
      deal = `, and ${withDeal[0].name} comes with a member deal`
    } else if (withDeal.length > 1) {
      deal = `, and ${withDeal.length} of them come with member deals`
    }
    parts.push(`${picks.length === 1 ? 'Our pick is' : 'Our picks are'} ${names}${deal}.`)
  }
  for (const g of gaps) {
    parts.push(`We don’t have a ${GAP_NOUN[g.need]} partner${g.area ? ` in ${g.area}` : ''} yet, but we can find one.`)
  }
  return parts.join(' ')
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
