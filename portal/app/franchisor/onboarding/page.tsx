import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingQuiz from './OnboardingQuiz'

export default async function FranchisorOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: franchisorProfile } = await supabase
    .from('franchisor_profiles')
    .select('id, quiz_completed_at, brand_name')
    .eq('user_id', user.id)
    .single()

  // Already completed — go to dashboard
  if (franchisorProfile?.quiz_completed_at) {
    redirect('/franchisor')
  }

  const { data: profile } = await supabase
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
    />
  )
}
