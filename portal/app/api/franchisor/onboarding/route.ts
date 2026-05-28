import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { answers, franchisorId } = await request.json()

    const admin = createAdminClient()

    // Get or create franchisor profile
    let profileId = franchisorId as string | null

    if (!profileId) {
      const { data: newProfile, error: profileError } = await admin
        .from('franchisor_profiles')
        .insert({ user_id: user.id, status: 'draft' })
        .select('id')
        .single()

      if (profileError || !newProfile) {
        console.error('Profile create error:', profileError)
        return NextResponse.json({ error: 'Could not create franchisor profile' }, { status: 500 })
      }
      profileId = newProfile.id
    }

    // Parse commercial term numerics safely
    const franchiseFee   = answers.franchise_fee    ? parseFloat(answers.franchise_fee)    : null
    const royaltyPct     = answers.royalty_pct      ? parseFloat(answers.royalty_pct)      : null
    const marketingLevy  = answers.marketing_levy_pct ? parseFloat(answers.marketing_levy_pct) : null

    // Save questionnaire answers
    const { error: quizError } = await admin
      .from('franchisor_questionnaires')
      .upsert(
        {
          franchisor_id: profileId,
          // Section 1 — Your Business
          core_model: answers.core_model || null,
          high_performing_unit: answers.high_performing_unit || null,
          format_types: answers.format_types?.length ? answers.format_types : null,
          operating_model_raw: answers.operating_model_raw || null,
          // Section 2 — Investment & Commercials
          investment_min: answers.investment_min ?? null,
          investment_max: answers.investment_max ?? null,
          liquid_capital_min: answers.liquid_capital_min ?? null,
          franchise_fee: franchiseFee,
          royalty_pct: royaltyPct,
          marketing_levy_pct: marketingLevy,
          break_even_months: answers.break_even_months ?? null,
          // Section 3 — Ideal Franchisee
          ideal_franchisee_profile: answers.ideal_franchisee_profile || null,
          experience_required: answers.experience_required || null,
          full_time_required: answers.full_time_required ?? null,
          single_franchise_licenses: answers.single_franchise_licenses ?? null,
          decline_reasons: answers.decline_reasons ?? [],
          // Section 2 — additional
          common_objections: answers.common_objections || null,
          // Section 3 — Ideal Franchisee (additional)
          approval_factors: answers.approval_factors ?? [],
          // Section 4 — Growth & Territory
          locations_available: answers.locations_available?.length ? answers.locations_available : null,
          priority_territories: answers.priority_territories || null,
          growth_target_units: answers.growth_target_units ?? null,
          annual_growth_targets: answers.annual_growth_targets || null,
          scaling_concerns: answers.scaling_concerns || null,
          timeline_months: answers.timeline_months ?? null,
          inquiry_channels: answers.inquiry_channels ?? [],
          // Section 5 — Recruitment Process
          screening_steps: answers.screening_steps?.length ? answers.screening_steps : null,
          screening_method: answers.screening_steps?.length
            ? answers.screening_steps.join('\n')
            : null,
          approval_timing: answers.approval_timing || null,
          approval_authority: answers.approval_authority || null,
          timeline_inquiry_to_contract: answers.timeline_inquiry_to_contract || null,
          post_signing_activities: answers.post_signing_activities || null,
          timeline_signing_to_launch: answers.timeline_signing_to_launch || null,
          process_bottlenecks: answers.process_bottlenecks || null,
          recruitment_process_rating: answers.recruitment_process_rating || null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'franchisor_id' }
      )

    if (quizError) {
      console.error('Quiz save error:', quizError)
      return NextResponse.json({ error: `Could not save quiz: ${quizError.message}` }, { status: 500 })
    }

    // Update franchisor profile: mark quiz complete + move to pending_review + sync matching-critical fields
    const profileUpdates: Record<string, unknown> = {
      quiz_completed_at: new Date().toISOString(),
      status: 'pending_review',
    }

    // Investment range
    if (answers.investment_min != null) profileUpdates.investment_min = answers.investment_min
    if (answers.investment_max != null) profileUpdates.investment_max = answers.investment_max

    // Commercial terms
    if (franchiseFee  != null) profileUpdates.franchise_fee       = franchiseFee
    if (royaltyPct    != null) profileUpdates.royalty_pct         = royaltyPct
    if (marketingLevy != null) profileUpdates.marketing_levy_pct  = marketingLevy

    // Operating model
    if (answers.operating_model_raw) {
      const modelMap: Record<string, string> = {
        'owner-operator': 'owner-operator',
        'hire-manager':   'hire-manager',
        'either':         'either',
      }
      if (modelMap[answers.operating_model_raw]) {
        profileUpdates.operator_model = modelMap[answers.operating_model_raw]
      }
    }

    // Multi-site (inverse of single_franchise_licenses)
    if (answers.single_franchise_licenses !== null && answers.single_franchise_licenses !== undefined) {
      profileUpdates.multi_site_ready = !answers.single_franchise_licenses
    }

    // Matching-critical fields
    if (answers.liquid_capital_min != null) profileUpdates.liquid_capital_min  = answers.liquid_capital_min
    if (answers.experience_required)        profileUpdates.experience_required  = answers.experience_required
    if (answers.full_time_required != null) profileUpdates.full_time_required   = answers.full_time_required
    if (answers.timeline_months    != null) profileUpdates.timeline_months      = answers.timeline_months
    if (answers.format_types?.length)       profileUpdates.format               = answers.format_types
    if (answers.locations_available?.length) profileUpdates.locations_available = answers.locations_available

    const { error: profileError } = await admin
      .from('franchisor_profiles')
      .update(profileUpdates)
      .eq('id', profileId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json({ error: `Could not update profile: ${profileError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Onboarding API error:', err)
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
