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
      // Create a minimal franchisor profile
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

    // Save questionnaire answers
    const { error: quizError } = await admin
      .from('franchisor_questionnaires')
      .upsert(
        {
          franchisor_id: profileId,
          core_model: answers.core_model || null,
          competitive_advantage: answers.competitive_advantage || null,
          revenue_streams: answers.revenue_streams || null,
          high_performing_unit: answers.high_performing_unit || null,
          underperformance_reasons: answers.underperformance_reasons || null,
          commercial_rates: answers.commercial_rates || null,
          financial_metrics_shared: answers.financial_metrics_shared || null,
          underestimated_costs: answers.underestimated_costs || null,
          common_objections: answers.common_objections || null,
          ideal_franchisee_profile: answers.ideal_franchisee_profile || null,
          background_experience: answers.background_experience || null,
          approval_factors: answers.approval_factors ?? [],
          single_franchise_licenses: answers.single_franchise_licenses ?? null,
          operating_model_raw: answers.operating_model_raw || null,
          decline_reasons: answers.decline_reasons ?? [],
          problematic_behaviours: answers.problematic_behaviours || null,
          success_definition: answers.success_definition || null,
          annual_growth_targets: answers.annual_growth_targets || null,
          priority_territories: answers.priority_territories || null,
          growth_speed_vs_quality: null,   // replaced by growth_quality_score slider
          scaling_concerns: answers.scaling_concerns || null,
          inquiry_channels: answers.inquiry_channels ?? [],
          screening_method: answers.screening_steps?.length
            ? answers.screening_steps.join('\n')
            : answers.screening_method || null,
          approval_timing: answers.approval_timing || null,
          approval_authority: answers.approval_authority || null,
          timeline_inquiry_to_contract: answers.timeline_inquiry_to_contract || null,
          post_signing_activities: answers.post_signing_activities || null,
          timeline_signing_to_launch: answers.timeline_signing_to_launch || null,
          process_bottlenecks: answers.process_bottlenecks || null,
          recruitment_process_rating: answers.recruitment_process_rating || null,
          // Gamified / numeric fields
          investment_min: answers.investment_min ?? null,
          investment_max: answers.investment_max ?? null,
          investment_range_raw: answers.investment_notes || null,
          break_even_months: answers.break_even_months ?? null,
          break_even_timeline: answers.break_even_notes || null,
          growth_target_units: answers.growth_target_units ?? null,
          growth_quality_score: answers.growth_quality_score ?? null,
          screening_steps: answers.screening_steps?.length ? answers.screening_steps : null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'franchisor_id' }
      )

    if (quizError) {
      console.error('Quiz save error:', quizError)
      return NextResponse.json({ error: `Could not save quiz: ${quizError.message}` }, { status: 500 })
    }

    // Update franchisor profile: mark quiz complete + apply answers to profile fields
    const profileUpdates: Record<string, unknown> = {
      quiz_completed_at: new Date().toISOString(),
    }

    // Map operating model to profile field
    if (answers.operating_model_raw) {
      const modelMap: Record<string, string> = {
        'owner-operator': 'owner-operator',
        'hire-manager': 'hire-manager',
        'either': 'either',
      }
      if (modelMap[answers.operating_model_raw]) {
        profileUpdates.operator_model = modelMap[answers.operating_model_raw]
      }
    }

    // Map single_franchise_licenses → multi_site_ready (inverse)
    if (answers.single_franchise_licenses !== null) {
      profileUpdates.multi_site_ready = !answers.single_franchise_licenses
    }

    await admin
      .from('franchisor_profiles')
      .update(profileUpdates)
      .eq('id', profileId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Onboarding API error:', err)
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
