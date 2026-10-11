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

import { dropFromQuery, isOffKey } from './parse.ts'
import { addWorkingHours, isWorkingTime } from './sla.ts'

test('switching chips off removes needs and dimensions', () => {
  const p = dropFromQuery(parseQuery('solicitor and insurance in Leeds for £90k'), ['need:legal', 'area'])
  assert.deepEqual(p.needs, ['insurance'])
  assert.equal(p.area, null)
  assert.equal(p.budget, 90_000)
  assert.equal(isOffKey('need:legal'), true)
  assert.equal(isOffKey('need:nonsense'), false)
  assert.equal(isOffKey('budget'), true)
})

test('working hours: 4h brief SLA skips nights and weekends', () => {
  // Fri 16:00 London (BST, UTC+1) → 2h left Friday, 2h Monday → Mon 11:00 London
  const due = addWorkingHours(new Date('2026-10-09T15:00:00Z'), 4)
  assert.equal(due.toISOString(), '2026-10-12T10:00:00.000Z')
  // Tue 10:00 London → Tue 14:00 London
  assert.equal(addWorkingHours(new Date('2026-10-13T09:00:00Z'), 4).toISOString(), '2026-10-13T13:00:00.000Z')
  assert.equal(isWorkingTime(new Date('2026-10-10T11:00:00Z')), false) // Saturday
})

import { introStatus } from './intro-status.ts'

test('intro status: steps, contact reveal and closing', () => {
  assert.equal(introStatus('to_brief').step, 1)
  assert.equal(introStatus('to_brief').contactVisible, false)
  assert.equal(introStatus('briefed').status, 'Briefed, awaiting contact')
  assert.equal(introStatus('in_contact').contactVisible, true)
  assert.equal(introStatus('in_contact', { rated: true }).next, 'Thanks for the update')
  assert.equal(introStatus('closed', { outcome: 'hired' }).status, 'Done · you worked with them')
  assert.equal(introStatus('closed').open, false)
  assert.equal(introStatus('withdrawn').step, 0)
  assert.match(introStatus('to_brief', { slaDueAt: '2026-10-12T10:00:00Z' }).next, /^We’ll brief them by Monday 11am$/)
})

import { briefTemplate, chaseTemplate, textEmailHtml } from './brief.ts'

test('briefing email: names, plan facts, need, deal and contact', () => {
  const t = briefTemplate({
    partnerName: 'Capital Forge', contactName: 'Jo Patel', memberName: 'Sarah Ahmed',
    memberEmail: 'sarah@example.com', memberPhone: '07700 900000',
    context: { brand: 'Brew & Co.', sector: 'coffee', area: 'Manchester', budget: '£120k', stage: 'opening', role: 'franchisee' },
    need: 'Funding for ~70% of £120k.', callTime: 'mornings', deal: 'Arrangement fee waived', senderName: 'Harry',
  })
  assert.match(t, /^Hi Jo,/)
  assert.match(t, /Introducing Sarah Ahmed, franchisee with Brew & Co\. Coffee franchise, Manchester, budget around £120k, signed and opening\./)
  assert.match(t, /What they need: Funding for ~70% of £120k\./)
  assert.match(t, /Best time for a call: mornings\./)
  assert.match(t, /member deal applies: Arrangement fee waived\./)
  assert.match(t, /sarah@example\.com · 07700 900000/)
  assert.match(t, /Harry, Franchise Foundry$/)
  assert.match(chaseTemplate({ partnerName: 'Capital Forge', contactName: null, memberName: 'Sarah', senderName: 'Ben' }), /^Hi Capital Forge team,/)
})

test('email html escapes everything the member or admin typed', () => {
  const html = textEmailHtml('Hi <script>alert(1)</script>\n\nTom & Jerry')
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes('Tom &amp; Jerry'))
})
