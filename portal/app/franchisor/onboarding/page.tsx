import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OnboardingQuiz from './OnboardingQuiz'

export default async function FranchisorOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: franchisorProfile } = await admin
    .from('franchisor_profiles')
    .select('id, quiz_completed_at, brand_name')
    .eq('user_id', user.id)
    .single()

  // Already fully submitted — send to dashboard
  if (franchisorProfile?.quiz_completed_at) {
    redirect('/franchisor')
  }

  // Load any saved progress
  let existingQuestionnaire = null
  if (franchisorProfile?.id) {
    const { data: q } = await admin
      .from('franchisor_questionnaires')
      .select('*')
      .eq('franchisor_id', franchisorProfile.id)
      .single()
    existingQuestionnaire = q
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

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
