import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OnboardingQuiz from './OnboardingQuiz'

interface Props {
  searchParams: Promise<{ add_brand?: string }>
}

export default async function FranchisorOnboardingPage({ searchParams }: Props) {
  const sp = await searchParams
  const isAddingBrand = sp.add_brand === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  // ── Adding a new brand to an existing account ─────────────────────────────
  if (isAddingBrand) {
    // Pre-fill from franchisor_companies — the canonical home of Section 5 data
    const { data: company } = await admin
      .from('franchisor_companies')
      .select(
        'inquiry_channels, screening_steps, screening_method, approval_timing, ' +
        'approval_authority, timeline_inquiry_to_contract, post_signing_activities, ' +
        'timeline_signing_to_launch, process_bottlenecks, recruitment_process_rating'
      )
      .eq('user_id', user.id)
      .maybeSingle()

    return (
      <OnboardingQuiz
        franchisorId={null}          // null → creates a fresh brand profile on first save
        userId={user.id}
        firstName={firstName}
        brandName={null}
        isAddingBrand={true}
        existingAnswers={company}    // Section 5 pre-filled; Sections 1–4 default to empty
      />
    )
  }

  // ── First brand for this account ─────────────────────────────────────────
  // Only consider incomplete profiles (quiz_completed_at is null)
  const { data: franchisorProfile } = await admin
    .from('franchisor_profiles')
    .select('id, quiz_completed_at, brand_name')
    .eq('user_id', user.id)
    .is('quiz_completed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // All brands already submitted — redirect to portal
  if (!franchisorProfile) {
    const { data: anyProfile } = await admin
      .from('franchisor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (anyProfile) redirect('/franchisor')
  }

  // Load any saved progress for the in-progress brand
  let existingQuestionnaire = null
  if (franchisorProfile?.id) {
    const { data: q } = await admin
      .from('franchisor_questionnaires')
      .select('*')
      .eq('franchisor_id', franchisorProfile.id)
      .maybeSingle()
    existingQuestionnaire = q
  }

  return (
    <OnboardingQuiz
      franchisorId={franchisorProfile?.id ?? null}
      userId={user.id}
      firstName={firstName}
      brandName={franchisorProfile?.brand_name ?? null}
      existingAnswers={existingQuestionnaire}
    />
  )
}
