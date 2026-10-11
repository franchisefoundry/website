/**
 * Rules parser for Foundry Search. Turns plain English into needs, sector,
 * area, budget and stage. Pure and fast (no I/O), so it powers the live
 * "Understood" readout on every keystroke. The AI parser, when it arrives,
 * returns the same shape and falls back to this.
 */
import {
  NEEDS, NEED_PATTERNS, SECTORS, PLACES, AMBIGUOUS_PLACES, STAGE_PATTERNS,
  type Need, type Region, type Stage,
} from './taxonomy.ts'
import type { ParsedQuery } from './types.ts'

const MAX_QUERY = 300

export function parseQuery(input: string): ParsedQuery {
  const raw = (input ?? '').slice(0, MAX_QUERY).trim()
  const q = raw.toLowerCase()

  const needs: Need[] = []
  const needTerms: Partial<Record<Need, string>> = {}
  for (const need of NEEDS) {
    for (const re of NEED_PATTERNS[need]) {
      const m = q.match(re)
      if (m) {
        needs.push(need)
        needTerms[need] = m[0].trim()
        break
      }
    }
  }

  return {
    raw,
    needs,
    needTerms,
    sector: parseSector(q),
    area: parseArea(raw, q),
    budget: parseBudget(q),
    stage: parseStage(q),
  }
}

function parseSector(q: string) {
  for (const s of SECTORS) if (s.pattern.test(q)) return { key: s.key, label: s.label }
  return null
}

function parseArea(raw: string, q: string): ParsedQuery['area'] {
  for (const [place, region] of PLACES) {
    const re = new RegExp(`\\b${place.replace(/ /g, '\\s+')}\\b`)
    const m = q.match(re)
    if (!m || m.index === undefined) continue
    if (AMBIGUOUS_PLACES.has(place)) {
      const original = raw.slice(m.index, m.index + m[0].length)
      const before = q.slice(Math.max(0, m.index - 12), m.index)
      const capitalised = original[0] === original[0].toUpperCase()
      if (!capitalised && !/\b(in|near|around|from)\s+$/.test(before)) continue
    }
    return { label: titleCase(place), region: region as Region }
  }
  return null
}

/**
 * Budgets: "£120k", "£120,000", "120k", "£1.2m", "£90-120k". A range gives
 * its top end. Bare numbers without £, k or m are ignored ("6 weeks").
 */
function parseBudget(q: string): number | null {
  const amounts: number[] = []
  const re = /(£)?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k|m|thousand|million)?\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(q))) {
    const [, pound, num, unit] = m
    if (!pound && !unit) continue
    let n = parseFloat(num.replace(/,/g, ''))
    if (unit === 'k' || unit === 'thousand') n *= 1_000
    if (unit === 'm' || unit === 'million') n *= 1_000_000
    // "£90-120k": the k applies to both ends; the first number reads as 90
    if (!unit && n < 1_000) {
      const after = q.slice(re.lastIndex).match(/^\s?[-–to ]+\s?£?\d+(?:\.\d+)?\s?(k|m)\b/)
      if (after) n *= after[1] === 'm' ? 1_000_000 : 1_000
    }
    if (n >= 1_000 && n <= 50_000_000) amounts.push(Math.round(n))
  }
  return amounts.length ? Math.max(...amounts) : null
}

function parseStage(q: string): Stage | null {
  for (const [stage, re] of STAGE_PATTERNS) if (re.test(q)) return stage
  return null
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

/** "£120k", "£1.2m", "£85,000" for chips and copy. */
export function formatBudget(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}m`
  if (n >= 1_000) return `£${Math.round(n / 1_000)}k`
  return `£${n}`
}
