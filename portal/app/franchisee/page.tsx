import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MATCH_PIPELINE_STAGES } from '@/lib/supabase/types'
import { formatInvestmentRange } from '@/lib/utils'
import { FranchiseeHomeView } from '@/components/franchisee/FranchiseeHomeView'

export default async function FranchiseeDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: franchiseeProfile }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('franchisee_profiles')
      .select('id, assigned_franchisor_id, backup_franchisor_1_id, backup_franchisor_2_id')
      .eq('user_id', user!.id)
      .single(),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const profileId = franchiseeProfile?.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fp = franchiseeProfile as any
  const hasPrimaryBrand = !!fp?.assigned_franchisor_id

  const admin = createAdminClient()

  const [{ data: allMatches }, { data: primaryMatch }] = await Promise.all([
    profileId
      ? admin.from('matches').select('id, status, score').eq('franchisee_id', profileId).not('status', 'eq', 'declined')
      : Promise.resolve({ data: [] as { id: string; status: string; score: number }[] }),
    hasPrimaryBrand && profileId
      ? admin.from('matches')
          .select(`id, pipeline_stage, franchisor_notes,
            franchisor_profiles(id, brand_name, category, teaser, logo_url, investment_min, investment_max, investment_display, timeline_months, operator_model, experience_required)`)
          .eq('franchisee_id', profileId).eq('franchisor_id', fp.assigned_franchisor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const totalMatches    = (allMatches ?? []).length
  const interestedCount = (allMatches ?? []).filter(m => m.status === 'interested').length
  const introCount      = (allMatches ?? []).filter(m => m.status === 'intro_made').length

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pb = (primaryMatch?.franchisor_profiles as any) ?? null
  const currentStageIdx = MATCH_PIPELINE_STAGES.findIndex(s => s.value === primaryMatch?.pipeline_stage)

  // Profile completeness
  const pf = franchiseeProfile as Record<string, unknown> | null
  const profileFields = ['investment_min', 'investment_max', 'liquid_capital', 'preferred_locations', 'operator_model', 'timeline_months', 'goals']
  const filledFields  = profileFields.filter(f => pf?.[f] !== null && pf?.[f] !== undefined && pf?.[f] !== '').length
  const completeness  = Math.round((filledFields / profileFields.length) * 100)

  // Contextual attention copy per pipeline stage
  const ATTENTION: Record<string, { heading: string; body: string }> = {
    match_assigned: { heading: 'Your consultant has found a match', body: 'A brand has been identified as a great fit for you. Head to your journey page to see the details.' },
    match_approved: { heading: 'Introduction being arranged', body: "We've confirmed this is a strong fit and are arranging your introduction now. Expect a call soon." },
    meeting_booked: { heading: 'Your intro meeting is booked — prepare now', body: 'Think about what you want from this meeting — day-to-day operations, investment returns and support are all fair game.' },
    agreement_sent: { heading: 'Your franchise agreement is ready to review', body: "Take your time — this is an important document. Ask your consultant for guidance any time." },
    agreement_signed: { heading: "You're in — welcome to the network", body: 'Your agreement is signed. Your franchisor will be in touch with onboarding details very soon.' },
  }
  const attention = primaryMatch?.pipeline_stage ? ATTENTION[primaryMatch.pipeline_stage] ?? null : null

  const kpis = [
    { n: totalMatches, l: 'Brands matched' },
    { n: interestedCount, l: "You're interested" },
    { n: introCount, l: 'Intros arranged' },
    { n: completeness, l: 'Profile complete', suffix: '%' },
  ]

  const brand = hasPrimaryBrand && pb ? {
    brand_name: pb.brand_name ?? null,
    category: pb.category ?? null,
    teaser: pb.teaser ?? null,
    investment_display: pb.investment_display || (pb.investment_min && pb.investment_max ? formatInvestmentRange(pb.investment_min, pb.investment_max) : null),
    timeline_months: pb.timeline_months ?? null,
    operator_model: pb.operator_model ?? null,
  } : null

  return (
    <FranchiseeHomeView
      firstName={firstName}
      profileExists={!!profileId}
      hasPrimaryBrand={hasPrimaryBrand}
      primaryBrand={brand}
      stageIndex={currentStageIdx}
      consultantNote={primaryMatch?.franchisor_notes ?? null}
      attention={attention}
      kpis={kpis}
      completeness={completeness}
    />
  )
}
