/**
 * Server-side data access for The Foundry. Always the service-role client,
 * always an explicit list of public columns, so nothing private (contacts,
 * notes) can reach the website or a visitor.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseQuery, type OffKey } from './parse.ts'
import type { Stage } from './taxonomy.ts'
import type { EnginePartner, PlanContext } from './types.ts'
import type { FoundryViewer } from './access'

const PUBLIC_PARTNER_COLUMNS = [
  'id', 'slug', 'name', 'category', 'audience', 'tagline', 'offer_text', 'trust_level', 'regions',
  'base_location', 'price_from', 'budget_min_gbp', 'budget_max_gbp', 'sectors', 'keywords',
  'client_count', 'reply_hours_typical',
].join(', ')

export async function loadPartners(admin: SupabaseClient, { includeDemo }: { includeDemo: boolean }): Promise<EnginePartner[]> {
  let q = admin.from('partners').select(PUBLIC_PARTNER_COLUMNS).eq('status', 'live')
  if (!includeDemo) q = q.eq('is_demo', false)
  const { data, error } = await q.order('display_order', { ascending: true })
  if (error) throw new Error(`loadPartners: ${error.message}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(r => ({
    id: r.id, slug: r.slug, name: r.name, category: r.category, audience: r.audience ?? 'both',
    tagline: r.tagline, offer_text: r.offer_text, trust_level: r.trust_level ?? 'listed',
    regions: r.regions ?? [], base_location: r.base_location, price_from: r.price_from,
    budget_min_gbp: r.budget_min_gbp, budget_max_gbp: r.budget_max_gbp,
    sectors: r.sectors ?? [], keywords: r.keywords ?? [], client_count: r.client_count,
    reply_hours: r.reply_hours_typical,
  }))
}

/** Plan chips a member can switch off. */
export type PlanChip = 'brand' | 'area' | 'budget' | 'stage' | 'sector'

const STAGE_FROM_PIPELINE: Record<string, Stage> = {
  new_enquiry: 'exploring', profile_complete: 'exploring', matches_sent: 'exploring',
  brand_shortlisted: 'exploring', meeting_booked: 'exploring', intro_made: 'exploring',
  agreement_sent: 'opening', signed: 'opening',
}

/**
 * Build the member's plan from their portal record. Website visitors get
 * { audience: 'any' }. Chips listed in `off` are left out.
 */
export async function planContextFor(
  admin: SupabaseClient, viewer: FoundryViewer | null, off: OffKey[] = [],
): Promise<PlanContext> {
  if (!viewer) return { audience: 'any' }
  const use = (c: PlanChip) => !(off as string[]).includes(c)

  if (viewer.role === 'franchisee') {
    const { data: fp } = await admin.from('franchisee_profiles')
      .select('investment_max, preferred_locations, pipeline_stage, assigned_franchisor_id')
      .eq('user_id', viewer.id).maybeSingle()
    let brand: string | null = null
    let sector: PlanContext['sector'] = null
    if (fp?.assigned_franchisor_id) {
      const { data: fr } = await admin.from('franchisor_profiles')
        .select('brand_name, category').eq('id', fp.assigned_franchisor_id).maybeSingle()
      brand = fr?.brand_name ?? null
      sector = fr?.category ? parseQuery(fr.category).sector : null
    }
    const location = (fp?.preferred_locations as string[] | null)?.[0] ?? null
    return {
      audience: 'franchisee',
      brand: use('brand') ? brand : null,
      sector: use('sector') ? sector : null,
      area: use('area') && location ? parseQuery(location).area : null,
      budget: use('budget') ? (fp?.investment_max ?? null) : null,
      stage: use('stage') && fp?.pipeline_stage ? STAGE_FROM_PIPELINE[fp.pipeline_stage] ?? null : null,
    }
  }

  if (viewer.role === 'franchisor') {
    const { data: fr } = await admin.from('franchisor_profiles')
      .select('brand_name, category').eq('user_id', viewer.id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
    return {
      audience: 'franchisor',
      brand: use('brand') ? fr?.brand_name ?? null : null,
      sector: use('sector') && fr?.category ? parseQuery(fr.category).sector : null,
    }
  }

  // Agents and admins see everything; plan comes from the query alone.
  return { audience: 'any' }
}

export interface PartnerProfileData extends EnginePartner {
  description: string | null
  our_take: string | null
  services: { title: string; description?: string; price?: string }[]
  faqs: { q: string; a: string }[]
  features: { label: string; value: string }[]
  deal_terms: string | null
  logo_url: string | null
}

const PROFILE_COLUMNS = 'description, our_take, services, faqs, features, deal_terms, logo_url'

/** One partner's public profile. null if not live (or demo outside preview). */
export async function loadPartnerProfile(
  admin: SupabaseClient, slug: string, { includeDemo }: { includeDemo: boolean },
): Promise<PartnerProfileData | null> {
  let q = admin.from('partners')
    .select(`${PUBLIC_PARTNER_COLUMNS}, ${PROFILE_COLUMNS}`)
    .eq('slug', slug).eq('status', 'live')
  if (!includeDemo) q = q.eq('is_demo', false)
  const { data } = await q.maybeSingle()
  if (!data) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any
  return {
    id: r.id, slug: r.slug, name: r.name, category: r.category, audience: r.audience ?? 'both',
    tagline: r.tagline, offer_text: r.offer_text, trust_level: r.trust_level ?? 'listed',
    regions: r.regions ?? [], base_location: r.base_location, price_from: r.price_from,
    budget_min_gbp: r.budget_min_gbp, budget_max_gbp: r.budget_max_gbp,
    sectors: r.sectors ?? [], keywords: r.keywords ?? [], client_count: r.client_count,
    reply_hours: r.reply_hours_typical,
    description: r.description, our_take: r.our_take,
    services: Array.isArray(r.services) ? r.services : [],
    faqs: Array.isArray(r.faqs) ? r.faqs : [],
    features: Array.isArray(r.features) ? r.features : [],
    deal_terms: r.deal_terms,
    logo_url: /^https:\/\//.test(r.logo_url ?? '') ? r.logo_url : null,
  }
}

/**
 * Every live partner's public profile, for the website build. Preview builds
 * get only demo partners, so a real partner never appears before launch.
 */
export async function loadProfilesForBuild(admin: SupabaseClient, { demo }: { demo: boolean }): Promise<PartnerProfileData[]> {
  const { data, error } = await admin.from('partners').select('slug').eq('status', 'live').eq('is_demo', demo)
    .order('display_order', { ascending: true })
  if (error) throw new Error(`loadProfilesForBuild: ${error.message}`)
  const out: PartnerProfileData[] = []
  for (const { slug } of data ?? []) {
    const p = await loadPartnerProfile(admin, slug, { includeDemo: demo })
    if (p) out.push(p)
  }
  return out
}
