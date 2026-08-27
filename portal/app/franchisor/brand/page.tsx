import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { SettingsTabs } from '@/components/SettingsTabs'
import { resolveBrand } from '@/lib/resolve-brand'
import BrandProfileForm from '../brand-profile/brand-profile-form'
import QuestionnaireForm from '../questionnaire/QuestionnaireForm'
import { BrandTerritoriesView } from '@/components/franchisor/BrandTerritoriesView'
import { FranchisorIcon, QuestionnaireIcon, PropertyIcon } from '@/components/icons'

export default async function BrandPage() {
  const { brandProfile, userId } = await resolveBrand()
  if (!userId) redirect('/login')

  // Questionnaire (merged with profile fields as fallback — mirrors the old page)
  let merged: Record<string, unknown> | null = null
  if (brandProfile) {
    const admin = createAdminClient()
    const { data: q } = await admin.from('franchisor_questionnaires').select('*').eq('franchisor_id', brandProfile.id).single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = brandProfile as any
    merged = q ? {
      ...q,
      investment_min: q.investment_min ?? b.investment_min,
      investment_max: q.investment_max ?? b.investment_max,
      liquid_capital_min: q.liquid_capital_min ?? b.liquid_capital_min,
      experience_required: q.experience_required ?? b.experience_required,
      full_time_required: q.full_time_required ?? b.full_time_required,
      single_franchise_licenses: q.single_franchise_licenses ?? (b.multi_site_ready === false ? true : null),
      operating_model_raw: q.operating_model_raw ?? b.operator_model,
      timeline_months: q.timeline_months ?? b.timeline_months,
      format_types: q.format_types ?? b.format,
      locations_available: q.locations_available ?? b.locations_available,
    } : null
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <FranchisorIcon className="w-4 h-4" />, content: <BrandProfileForm brandProfile={brandProfile} userId={userId} /> },
    ...(brandProfile ? [
      { id: 'questionnaire', label: 'Questionnaire', icon: <QuestionnaireIcon className="w-4 h-4" />, content: <QuestionnaireForm franchisorId={brandProfile.id} existing={merged} /> },
      { id: 'territories', label: 'Territories', icon: <PropertyIcon className="w-4 h-4" />, content: <BrandTerritoriesView franchisorId={brandProfile.id} /> },
    ] : []),
  ]

  return (
    <div className="max-w-5xl">
      <PageHeader title="Your brand" description="Your profile, questionnaire and territories — everything candidates and our matching see." />
      <SettingsTabs tabs={tabs} />
    </div>
  )
}
