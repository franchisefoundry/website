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
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!franchisorProfile) redirect('/franchisor')

  const admin = createAdminClient()
  const { data: questionnaire } = await admin
    .from('franchisor_questionnaires')
    .select('*')
    .eq('franchisor_id', franchisorProfile.id)
    .single()

  // Merge profile matching fields into the questionnaire as fallback
  // so existing franchisors see their profile values pre-populated
  const merged = questionnaire ? {
    ...questionnaire,
    investment_min: questionnaire.investment_min ?? franchisorProfile.investment_min,
    investment_max: questionnaire.investment_max ?? franchisorProfile.investment_max,
    liquid_capital_min: questionnaire.liquid_capital_min ?? franchisorProfile.liquid_capital_min,
    experience_required: questionnaire.experience_required ?? franchisorProfile.experience_required,
    full_time_required: questionnaire.full_time_required ?? franchisorProfile.full_time_required,
    single_franchise_licenses: questionnaire.single_franchise_licenses ?? (franchisorProfile.multi_site_ready === false ? true : null),
    operating_model_raw: questionnaire.operating_model_raw ?? franchisorProfile.operator_model,
    timeline_months: questionnaire.timeline_months ?? franchisorProfile.timeline_months,
    format_types: questionnaire.format_types ?? franchisorProfile.format,
    locations_available: questionnaire.locations_available ?? franchisorProfile.locations_available,
  } : null

  return (
    <div>
      <PageHeader
        title="Your Questionnaire"
        description="Update your answers at any time. These help us match and brief candidates about your opportunity."
      />
      <QuestionnaireForm
        franchisorId={franchisorProfile.id}
        existing={merged}
      />
    </div>
  )
}
