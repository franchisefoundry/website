import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import QuestionnaireForm from './QuestionnaireForm'

export default async function QuestionnairePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: franchisorProfile } = await supabase
    .from('franchisor_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!franchisorProfile) redirect('/franchisor')

  const admin = createAdminClient()
  const { data: questionnaire } = await admin
    .from('franchisor_questionnaires')
    .select('*')
    .eq('franchisor_id', franchisorProfile.id)
    .single()

  return (
    <div>
      <PageHeader
        title="Your Questionnaire"
        description="Update your answers at any time. These help us match and brief candidates about your opportunity."
      />
      <QuestionnaireForm
        franchisorId={franchisorProfile.id}
        existing={questionnaire}
      />
    </div>
  )
}
