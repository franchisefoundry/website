// Run: npm run test:foundry  (Node's built-in test runner, native TS)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseQuery, formatBudget } from './parse.ts'
import { search, searchText } from './rank.ts'
import type { EnginePartner, PlanContext } from './types.ts'

function partner(p: Partial<EnginePartner> & Pick<EnginePartner, 'id' | 'name' | 'category'>): EnginePartner {
  return {
    slug: p.name.toLowerCase().replace(/[^a-z]+/g, '-'),
    audience: 'both', tagline: null, offer_text: null, trust_level: 'trusted',
    regions: ['uk'], base_location: null, price_from: null, budget_min_gbp: null, budget_max_gbp: null,
    sectors: [], keywords: [], client_count: null, reply_hours: null,
    ...p,
  }
}

// Mirrors scripts/foundry-demo.sql
const PARTNERS: EnginePartner[] = [
  partner({ id: 'cf', name: 'Capital Forge', category: 'funding', trust_level: 'recommended', base_location: 'Manchester',
    budget_min_gbp: 25_000, budget_max_gbp: 500_000, sectors: ['coffee', 'qsr', 'dessert'], reply_hours: 6, client_count: 60,
    offer_text: 'Arrangement fee waived', price_from: 'from 4.9% APR' }),
  partner({ id: 'nc', name: 'Northgate Counting', category: 'accounting', base_location: 'Leeds', sectors: ['coffee', 'qsr'],
    reply_hours: 8, client_count: 45, offer_text: 'First 3 months half price' }),
  partner({ id: 'hb', name: 'Hartley & Bloom', category: 'legal', audience: 'franchisee', trust_level: 'recommended',
    base_location: 'London', reply_hours: 4, client_count: 40 }),
  partner({ id: 'cc', name: 'Cornerstone Cover', category: 'insurance', base_location: 'Bristol', reply_hours: 4,
    client_count: 30, offer_text: 'No broker fees' }),
  partner({ id: 'ss', name: 'Sitefit Studio', category: 'property', audience: 'franchisee', base_location: 'Birmingham',
    regions: ['nw', 'ne', 'yh', 'em', 'wm', 'ee', 'lon', 'se', 'sw'], reply_hours: 12, client_count: 25 }),
  partner({ id: 'ag', name: 'All Gravy', category: 'technology', trust_level: 'listed', reply_hours: 24, client_count: 20 }),
]

const VISITOR: PlanContext = { audience: 'any' }

test('parses the design’s example query', () => {
  const p = parseQuery('Funding and an accountant for a coffee franchise in Manchester, around £120k')
  assert.deepEqual(p.needs, ['funding', 'accounting'])
  assert.equal(p.sector?.key, 'coffee')
  assert.deepEqual(p.area, { label: 'Manchester', region: 'nw' })
  assert.equal(p.budget, 120_000)
})

test('reads budgets in different shapes and ignores non-money numbers', () => {
  assert.equal(parseQuery('about £85,000').budget, 85_000)
  assert.equal(parseQuery('120k budget').budget, 120_000)
  assert.equal(parseQuery('£1.2m second site').budget, 1_200_000)
  assert.equal(parseQuery('£90-120k').budget, 120_000)
  assert.equal(parseQuery('shopfitter who can finish in 6 weeks').budget, null)
  assert.equal(parseQuery('agreement review for £450').budget, null)
})

test('maps everyday phrasing to needs', () => {
  assert.deepEqual(parseQuery('Someone to check my franchise agreement').needs, ['legal'])
  assert.deepEqual(parseQuery('Insurance for a new coffee unit').needs, ['insurance'])
  assert.deepEqual(parseQuery('Shopfitter who can finish in 6 weeks').needs, ['property'])
  assert.deepEqual(parseQuery('someone to check my lease and insure the unit').needs, ['legal', 'insurance'])
  assert.deepEqual(parseQuery('recruitment for kiosk staff').needs, ['recruitment'])
})

test('ambiguous place names need a capital or "in"', () => {
  assert.equal(parseQuery('reading a disclosure document').area, null)
  assert.equal(parseQuery('solicitor in reading')?.area?.region, 'se')
  assert.equal(parseQuery('solicitor, Reading')?.area?.region, 'se')
})

test('reads stage hints', () => {
  assert.equal(parseQuery('funding for a second site').stage, 'expanding')
  assert.equal(parseQuery('just signed, need insurance').stage, 'opening')
  assert.equal(parseQuery('what do I need to open a gym franchise?').stage, 'exploring')
})

test('ranks the design example: picks, deal summary, also-need', () => {
  const r = searchText('Funding and an accountant for a coffee franchise in Manchester, around £120k', PARTNERS, VISITOR)
  assert.deepEqual(r.groups.map(g => g.items[0].name), ['Capital Forge', 'Northgate Counting'])
  const cf = r.groups[0].items[0]
  assert.equal(cf.label, 'Strong fit')
  assert.ok(cf.why[0].includes('£120k sits inside their £25k–£500k range'))
  assert.ok(cf.why.includes('Based in Manchester'))
  assert.match(r.summary, /^You need funding and an accountant\. Our picks are Capital Forge and Northgate Counting, and both come with a member deal\.$/)
  assert.deepEqual(r.alsoNeed.map(a => a.name), ['Hartley & Bloom', 'Cornerstone Cover'])
  assert.equal(r.alsoNeed[0].why[0], 'Lenders usually want the agreement reviewed first')
  assert.equal(r.gaps.length, 0)
})

test('a deal never changes the order', () => {
  const twins = [
    partner({ id: 'a', name: 'Alpha Legal', category: 'legal', reply_hours: 4 }),
    partner({ id: 'b', name: 'Beta Legal', category: 'legal', reply_hours: 4, offer_text: 'Big discount', trust_level: 'recommended' }),
  ]
  const r = searchText('solicitor', twins, VISITOR)
  assert.equal(r.groups[0].items[0].fit, r.groups[0].items[1].fit)
  assert.deepEqual(r.groups[0].items.map(i => i.name), ['Alpha Legal', 'Beta Legal']) // tie broken by name, not by deal
})

test('area coverage: no Scottish shopfitter becomes a gap', () => {
  const r = searchText('shopfitter Scotland', PARTNERS, VISITOR)
  assert.equal(r.groups.length, 0)
  assert.equal(r.gaps[0].message, 'No property partner in Scotland yet.')
  assert.deepEqual(r.unmetNeeds, ['property'])
  assert.match(r.summary, /We don’t have a property partner in Scotland yet/)
})

test('category with no partners at all is a gap', () => {
  const r = searchText('local marketing launch campaign', PARTNERS, VISITOR)
  assert.deepEqual(r.unmetNeeds, ['marketing'])
})

test('audience: franchisors do not see franchisee-only partners', () => {
  const r = searchText('solicitor', PARTNERS, { audience: 'franchisor' })
  assert.equal(r.groups.length, 0)
  assert.deepEqual(r.unmetNeeds, ['legal'])
})

test('plan context fills what the query leaves out, and the query wins', () => {
  const ctx: PlanContext = { audience: 'franchisee', area: { label: 'Glasgow', region: 'scot' }, budget: 120_000 }
  const fromPlan = searchText('shopfitter', PARTNERS, ctx)
  assert.equal(fromPlan.applied.area, 'Glasgow')
  assert.equal(fromPlan.groups.length, 0)
  const override = searchText('shopfitter in Leeds', PARTNERS, ctx)
  assert.equal(override.applied.area, 'Leeds')
  assert.equal(override.groups[0].items[0].name, 'Sitefit Studio')
})

test('no need stated: stage starters and a helpful summary', () => {
  const r = searchText('what do I need to open a gym franchise?', PARTNERS, VISITOR)
  assert.equal(r.groups.length, 0)
  assert.equal(r.alsoNeed.length, 3)
  assert.match(r.summary, /^Tell us what you need/)
})

test('empty query is safe', () => {
  const r = search(parseQuery(''), PARTNERS, VISITOR)
  assert.equal(r.groups.length, 0)
  assert.equal(r.partnerIds.length, r.alsoNeed.length)
})

test('formats budgets', () => {
  assert.equal(formatBudget(120_000), '£120k')
  assert.equal(formatBudget(1_200_000), '£1.2m')
  assert.equal(formatBudget(2_000_000), '£2m')
})
