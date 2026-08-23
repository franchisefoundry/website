import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { timeAgo, formatDate } from '@/lib/utils'

/**
 * GET /api/admin/crm-data
 * Feeds the ported v5 CRM design (/crm.html) with REAL data, mapped into the
 * shapes the design expects (CAND / BRANDS / AGENTS / PARTNERS). Admin-only.
 *
 * Only the network entities are wired here — the design's other sections
 * (Home KPIs, Analytics, Finance, Territories, Resales, Messages, Agreements)
 * remain sample data and are flagged as such in the UI + gap notes.
 */

// Real franchisee journey (matches the DB check constraint exactly).
const FEE_STAGES = [
  'new_enquiry', 'profile_complete', 'matches_sent', 'brand_shortlisted',
  'meeting_booked', 'intro_made', 'agreement_sent', 'signed',
]
const FEE_STAGE_LABELS = [
  'New Enquiry', 'Profile Complete', 'Matches Sent', 'Brand Shortlisted',
  'Meeting Booked', 'Intro Made', 'Agreement Sent', 'Signed',
]

const k = (n: number) => `${Math.round(n / 1000)}k`
function bud(min: number | null, max: number | null): string {
  if (!min && !max) return '—'
  if (min && max) return `£${k(min)}–${k(max)}`
  if (min) return `£${k(min)}+`
  return `Up to £${k(max as number)}`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const [
    { data: franchisees }, { data: franchisors }, { data: matches },
    { data: introducers }, { data: introLeads }, { data: commissions }, { data: partners },
  ] = await Promise.all([
    admin.from('franchisee_profiles')
      .select('*, profiles!franchisee_profiles_user_id_fkey(full_name, email)'),
    admin.from('franchisor_profiles').select('*'),
    admin.from('matches').select('franchisee_id, franchisor_id, score, status, pipeline_stage'),
    admin.from('profiles').select('id, full_name, email, referral_code, setup_complete').eq('role', 'introducer'),
    admin.from('introducer_leads').select('introducer_id, status, registered_at'),
    admin.from('introducer_commissions').select('introducer_id, commission_amount'),
    admin.from('partners').select('*').order('display_order'),
  ])

  const brandName = new Map((franchisors ?? []).map((f: any) => [f.id, f.brand_name]))

  // Best match per franchisee + candidate count per franchisor
  const bestByFee = new Map<string, any>()
  const candCount = new Map<string, number>()
  for (const m of matches ?? []) {
    candCount.set(m.franchisor_id, (candCount.get(m.franchisor_id) ?? 0) + 1)
    const cur = bestByFee.get(m.franchisee_id)
    if (!cur || (m.score ?? 0) > (cur.score ?? 0)) bestByFee.set(m.franchisee_id, m)
  }

  const CAND = (franchisees ?? []).map((f: any) => {
    const p = f.profiles ?? {}
    const assignedName = f.assigned_franchisor_id ? brandName.get(f.assigned_franchisor_id) : null
    const best = bestByFee.get(f.id)
    const brand = assignedName ?? (best ? brandName.get(best.franchisor_id) : null) ?? null
    const score = best?.score ?? null
    const stageIdx = Math.max(0, FEE_STAGES.indexOf(f.pipeline_stage ?? 'new_enquiry'))
    return {
      n: p.full_name || 'Unnamed franchisee',
      e: p.email || '',
      loc: (f.preferred_locations?.[0]) || '—',
      budget: bud(f.investment_min, f.investment_max),
      stage: stageIdx,
      brand,
      score,
      src: '—',                 // GAP: lead source not stored on franchisee_profiles
      last: timeAgo(f.updated_at),
      // why[] intentionally omitted — matching stores no reasons (GAP)
    }
  })

  const stMap: Record<string, string> = { pending_review: 'review', active: 'active', draft: 'draft', inactive: 'draft' }
  const BRANDS = (franchisors ?? []).map((b: any) => {
    const filled = ['brand_name', 'category', 'teaser', 'investment_min', 'franchise_fee', 'logo_url', 'highlights']
      .filter(kk => b[kk] != null && b[kk] !== '').length
    const updates: string[] = []
    if (b.status === 'pending_review') updates.push('Pending review')
    if (b.answers_changed_at) updates.push('Answers updated')
    return {
      n: b.brand_name || 'Unnamed brand',
      c: b.contact_name || '—',
      e: b.contact_email || '',
      fee: b.franchise_fee ? `£${k(b.franchise_fee)}` : (b.investment_display || '—'),
      cands: candCount.get(b.id) ?? 0,
      st: stMap[b.status] ?? 'draft',
      d: formatDate(b.updated_at || b.created_at),
      prog: Math.round((filled / 7) * 100),   // GAP: computed, no completeness column
      updates,
    }
  })

  const leadsByIntro = new Map<string, { total: number; reg: number }>()
  for (const l of introLeads ?? []) {
    const e = leadsByIntro.get(l.introducer_id) ?? { total: 0, reg: 0 }
    e.total++; if (l.registered_at) e.reg++
    leadsByIntro.set(l.introducer_id, e)
  }
  const commByIntro = new Map<string, number>()
  for (const c of commissions ?? []) {
    commByIntro.set(c.introducer_id, (commByIntro.get(c.introducer_id) ?? 0) + (c.commission_amount ?? 0))
  }
  const AGENTS = (introducers ?? []).map((a: any) => {
    const l = leadsByIntro.get(a.id) ?? { total: 0, reg: 0 }
    const comm = commByIntro.get(a.id) ?? 0
    return {
      n: a.full_name || 'Unnamed agent',
      e: a.email || '',
      code: a.referral_code || '—',
      leads: l.total,
      intros: l.reg,
      conv: l.total ? Math.round((l.reg / l.total) * 100) : 0,
      comm: `£${comm.toLocaleString()}`,
      st: a.setup_complete ? 'active' : 'pending',
      updates: [] as string[],
    }
  })

  const PARTNERS = (partners ?? []).map((p: any) => ({
    n: p.name,
    cat: p.category || 'Other',
    desc: p.description || p.tagline || '',
    intros: 0,                 // GAP: intro count per partner not tracked
    st: p.is_active ? 'active' : 'paused',
  }))

  return NextResponse.json({
    STAGES: FEE_STAGE_LABELS,
    CAND, BRANDS, AGENTS, PARTNERS,
    meta: {
      generatedAt: new Date().toISOString(),
      counts: { franchisees: CAND.length, brands: BRANDS.length, agents: AGENTS.length, partners: PARTNERS.length },
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
