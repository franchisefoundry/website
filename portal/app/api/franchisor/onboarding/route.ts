import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmins } from '@/lib/notifications'

// ── Company (Section 5) upsert payload builder ───────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCompanyUpsert(userId: string, answers: Record<string, any>) {
  return {
    user_id:                      userId,
    inquiry_channels:             answers.inquiry_channels         ?? [],
    screening_steps:              answers.screening_steps?.length ? answers.screening_steps : null,
    screening_method:             answers.screening_steps?.length ? answers.screening_steps.join('\n') : null,
    approval_timing:              answers.approval_timing          || null,
    approval_authority:           answers.approval_authority       || null,
    timeline_inquiry_to_contract: answers.timeline_inquiry_to_contract || null,
    post_signing_activities:      answers.post_signing_activities  || null,
    timeline_signing_to_launch:   answers.timeline_signing_to_launch || null,
    process_bottlenecks:          answers.process_bottlenecks      || null,
    recruitment_process_rating:   answers.recruitment_process_rating || null,
  }
}

// ── Shared upsert payload builder ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQuizUpsert(profileId: string, answers: Record<string, any>) {
  const franchiseFee   = answers.franchise_fee        ? parseFloat(answers.franchise_fee)        : null
  const royaltyPct     = answers.royalty_pct          ? parseFloat(answers.royalty_pct)          : null
  const marketingLevy  = answers.marketing_levy_pct   ? parseFloat(answers.marketing_levy_pct)   : null

  return {
    quiz: {
      franchisor_id: profileId,
      // Section 1 — The Business
      core_model:               answers.core_model               || null,
      competitive_advantage:    answers.competitive_advantage    || null,
      high_performing_unit:     answers.high_performing_unit     || null,
      underperformance_reasons: answers.underperformance_reasons || null,
      format_types:             answers.format_types?.length ? answers.format_types : null,
      operating_model_raw:      answers.operating_model_raw      || null,
      // Section 2 — Investment & Commercials
      investment_min:           answers.investment_min        ?? null,
      investment_max:           answers.investment_max        ?? null,
      liquid_capital_min:       answers.liquid_capital_min    ?? null,
      franchise_fee:            franchiseFee,
      royalty_pct:              royaltyPct,
      marketing_levy_pct:       marketingLevy,
      break_even_months:        answers.break_even_months     ?? null,
      financial_metrics_shared: answers.financial_metrics_shared || null,
      common_objections:        answers.common_objections        || null,
      // Section 3 — Ideal Franchisee
      ideal_franchisee_profile: answers.ideal_franchisee_profile || null,
      experience_required:      answers.experience_required      || null,
      full_time_required:       answers.full_time_required       ?? null,
      single_franchise_licenses: answers.single_franchise_licenses ?? null,
      decline_reasons:          answers.decline_reasons          ?? [],
      approval_factors:         answers.approval_factors         ?? [],
      // Section 4 — Growth & Territory
      locations_available:      answers.locations_available?.length ? answers.locations_available : null,
      priority_territories:     answers.priority_territories     || null,
      growth_target_units:      answers.growth_target_units      ?? null,
      annual_growth_targets:    answers.annual_growth_targets    || null,
      scaling_concerns:         answers.scaling_concerns         || null,
      timeline_months:          answers.timeline_months          ?? null,
      inquiry_channels:         answers.inquiry_channels         ?? [],
      // Section 5 — Recruitment Process
      screening_steps:          answers.screening_steps?.length ? answers.screening_steps : null,
      screening_method:         answers.screening_steps?.length ? answers.screening_steps.join('\n') : null,
      approval_timing:          answers.approval_timing          || null,
      approval_authority:       answers.approval_authority       || null,
      timeline_inquiry_to_contract: answers.timeline_inquiry_to_contract || null,
      post_signing_activities:  answers.post_signing_activities  || null,
      timeline_signing_to_launch: answers.timeline_signing_to_launch || null,
      process_bottlenecks:      answers.process_bottlenecks      || null,
      recruitment_process_rating: answers.recruitment_process_rating || null,
    },
    franchiseFee,
    royaltyPct,
    marketingLevy,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProfileUpdates(answers: Record<string, any>, franchiseFee: number | null, royaltyPct: number | null, marketingLevy: number | null) {
  const updates: Record<string, unknown> = {}

  if (answers.brand_name?.trim())    updates.brand_name          = answers.brand_name.trim()
  if (answers.investment_min != null) updates.investment_min     = answers.investment_min
  if (answers.investment_max != null) updates.investment_max     = answers.investment_max
  if (franchiseFee  != null)          updates.franchise_fee      = franchiseFee
  if (royaltyPct    != null)          updates.royalty_pct        = royaltyPct
  if (marketingLevy != null)          updates.marketing_levy_pct = marketingLevy

  if (answers.operating_model_raw) {
    const modelMap: Record<string, string> = {
      'owner-operator': 'owner-operator',
      'hire-manager':   'hire-manager',
      'either':         'either',
    }
    if (modelMap[answers.operating_model_raw]) {
      updates.operator_model = modelMap[answers.operating_model_raw]
    }
  }

  if (answers.single_franchise_licenses !== null && answers.single_franchise_licenses !== undefined) {
    updates.multi_site_ready = !answers.single_franchise_licenses
  }
  if (answers.liquid_capital_min != null) updates.liquid_capital_min  = answers.liquid_capital_min
  if (answers.experience_required)        updates.experience_required  = answers.experience_required
  if (answers.full_time_required != null) updates.full_time_required   = answers.full_time_required
  if (answers.timeline_months    != null) updates.timeline_months      = answers.timeline_months
  if (answers.format_types?.length)       updates.format               = answers.format_types
  if (answers.locations_available?.length) updates.locations_available = answers.locations_available

  return updates
}

// ── GET — load existing progress ──────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createAdminClient()

    const { data: fp } = await admin
      .from('franchisor_profiles')
      .select('id, brand_name')
      .eq('user_id', user.id)
      .single()

    if (!fp) return NextResponse.json({ franchisorId: null, brandName: null, questionnaire: null })

    const { data: fq } = await admin
      .from('franchisor_questionnaires')
      .select('*')
      .eq('franchisor_id', fp.id)
      .single()

    return NextResponse.json({
      franchisorId:  fp.id,
      brandName:     fp.brand_name ?? null,
      questionnaire: fq ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── PATCH — auto-save progress (no status change) ─────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { answers, franchisorId, saveCompanyData } = await request.json()
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

    const { quiz, franchiseFee, royaltyPct, marketingLevy } = buildQuizUpsert(profileId!, answers)

    const { error: quizError } = await admin
      .from('franchisor_questionnaires')
      .upsert(quiz, { onConflict: 'franchisor_id' })

    if (quizError) {
      console.error('Quiz save error:', quizError)
      return NextResponse.json({ error: `Could not save quiz: ${quizError.message}` }, { status: 500 })
    }

    // Save Section 5 to franchisor_companies when this is a first/single brand (not add_brand flow)
    if (saveCompanyData) {
      const companyPayload = buildCompanyUpsert(user.id, answers)
      const { error: companyError } = await admin
        .from('franchisor_companies')
        .upsert(companyPayload, { onConflict: 'user_id' })
      if (companyError) console.error('Company save error (non-fatal):', companyError)

      // Ensure the profile is linked to the company row
      const { data: company } = await admin
        .from('franchisor_companies')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (company) {
        await admin.from('franchisor_profiles').update({ company_id: company.id }).eq('id', profileId)
      }
    }

    // Update profile fields (no status change — that's only on final submit)
    const profileUpdates = buildProfileUpdates(answers, franchiseFee, royaltyPct, marketingLevy)
    if (Object.keys(profileUpdates).length) {
      await admin.from('franchisor_profiles').update(profileUpdates).eq('id', profileId)
    }

    return NextResponse.json({ success: true, franchisorId: profileId })
  } catch (err) {
    console.error('Onboarding PATCH error:', err)
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

// ── POST — final submit (sets pending_review) ─────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { answers, franchisorId, saveCompanyData } = await request.json()

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

    // When adding a second brand, pull Section 5 from franchisor_companies so the
    // questionnaire record is still fully populated (backward compat for admin views)
    let finalAnswers = answers
    if (!saveCompanyData) {
      const { data: company } = await admin
        .from('franchisor_companies')
        .select('inquiry_channels, screening_steps, screening_method, approval_timing, approval_authority, timeline_inquiry_to_contract, post_signing_activities, timeline_signing_to_launch, process_bottlenecks, recruitment_process_rating')
        .eq('user_id', user.id)
        .single()
      if (company) {
        finalAnswers = {
          ...answers,
          inquiry_channels:             company.inquiry_channels            ?? answers.inquiry_channels,
          screening_steps:              Array.isArray(company.screening_steps) ? company.screening_steps : answers.screening_steps,
          approval_timing:              company.approval_timing              ?? answers.approval_timing,
          approval_authority:           company.approval_authority           ?? answers.approval_authority,
          timeline_inquiry_to_contract: company.timeline_inquiry_to_contract ?? answers.timeline_inquiry_to_contract,
          post_signing_activities:      company.post_signing_activities      ?? answers.post_signing_activities,
          timeline_signing_to_launch:   company.timeline_signing_to_launch   ?? answers.timeline_signing_to_launch,
          process_bottlenecks:          company.process_bottlenecks          ?? answers.process_bottlenecks,
          recruitment_process_rating:   company.recruitment_process_rating   ?? answers.recruitment_process_rating,
        }
      }
    }

    const { quiz, franchiseFee, royaltyPct, marketingLevy } = buildQuizUpsert(profileId!, finalAnswers)

    // Save questionnaire with completed_at
    const { error: quizError } = await admin
      .from('franchisor_questionnaires')
      .upsert(
        { ...quiz, completed_at: new Date().toISOString() },
        { onConflict: 'franchisor_id' }
      )

    if (quizError) {
      console.error('Quiz save error:', quizError)
      return NextResponse.json({ error: `Could not save quiz: ${quizError.message}` }, { status: 500 })
    }

    // Save Section 5 to franchisor_companies + mark company quiz complete
    if (saveCompanyData) {
      const companyPayload = {
        ...buildCompanyUpsert(user.id, finalAnswers),
        company_quiz_completed_at: new Date().toISOString(),
      }
      const { error: companyError } = await admin
        .from('franchisor_companies')
        .upsert(companyPayload, { onConflict: 'user_id' })
      if (companyError) console.error('Company save error (non-fatal):', companyError)

      // Ensure the profile is linked to the company row
      const { data: company } = await admin
        .from('franchisor_companies')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (company) {
        await admin.from('franchisor_profiles').update({ company_id: company.id }).eq('id', profileId)
      }
    }

    // Update profile: mark complete + move to pending_review
    const profileUpdates = buildProfileUpdates(finalAnswers, franchiseFee, royaltyPct, marketingLevy)
    profileUpdates.quiz_completed_at = new Date().toISOString()
    profileUpdates.status = 'pending_review'

    const { error: profileError } = await admin
      .from('franchisor_profiles')
      .update(profileUpdates)
      .eq('id', profileId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json({ error: `Could not update profile: ${profileError.message}` }, { status: 500 })
    }

    // Notify admins that the quiz has been submitted
    const { data: fp } = await admin
      .from('franchisor_profiles')
      .select('brand_name')
      .eq('id', profileId)
      .single()

    const brandLabel = fp?.brand_name?.trim() || 'A franchisor'
    await notifyAdmins({
      type:  'franchisor_quiz_submitted',
      title: 'Franchisor quiz submitted',
      body:  `${brandLabel} has completed their onboarding quiz and is awaiting review.`,
      link:  '/admin/questionnaires',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Onboarding API error:', err)
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
