import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import Link from 'next/link'
import QuestionnaireReview from './QuestionnaireReview'
import type { SectionRow, QuestionRow } from '@/app/admin/questionnaire-template/page'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FranchisorQuestionnairePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()

  const [{ data: franchisor }, { data: questionnaire }, { data: sections }] = await Promise.all([
    admin.from('franchisor_profiles').select('*').eq('id', id).single(),
    admin.from('franchisor_questionnaires').select('*').eq('franchisor_id', id).single(),
    admin
      .from('questionnaire_sections')
      .select(`
        id, title, display_order,
        questionnaire_questions (
          id, question_text, field_key, input_type, options,
          textarea_rows, is_profile_linked, display_order, is_active
        )
      `)
      .order('display_order'),
  ])

  if (!franchisor) notFound()

  const shapedSections: SectionRow[] = (sections ?? []).map(s => ({
    id: s.id,
    title: s.title,
    display_order: s.display_order,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questions: ((s.questionnaire_questions as any[]) ?? [])
      .filter((q: QuestionRow) => q.is_active)
      .sort((a: QuestionRow, b: QuestionRow) => a.display_order - b.display_order),
  }))

  return (
    <div>
      <PageHeader
        title={`${franchisor.brand_name || 'Unnamed brand'} — Questionnaire`}
        description={
          questionnaire?.completed_at
            ? `Last updated ${new Date(questionnaire.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : 'No answers submitted yet — you can add them below.'
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/questionnaire-template"
              className="text-sm text-slate-500 border border-slate-300 hover:border-slate-400 px-4 py-2 rounded-lg transition-colors"
            >
              Edit template →
            </Link>
            <Link
              href={`/admin/franchisors/${id}`}
              className="text-sm text-slate-500 border border-slate-300 hover:border-slate-400 px-4 py-2 rounded-lg transition-colors"
            >
              ← Brand profile
            </Link>
          </div>
        }
      />

      <div className="max-w-3xl">
        <QuestionnaireReview
          franchisorId={id}
          status={franchisor.status ?? 'draft'}
          existing={questionnaire ? {
            ...questionnaire,
            // Merge profile fields as fallback when questionnaire columns are null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            investment_min:      questionnaire.investment_min      ?? (franchisor as any).investment_min,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            investment_max:      questionnaire.investment_max      ?? (franchisor as any).investment_max,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            liquid_capital_min:  questionnaire.liquid_capital_min  ?? (franchisor as any).liquid_capital_min,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            franchise_fee:       questionnaire.franchise_fee       ?? (franchisor as any).franchise_fee,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            royalty_pct:         questionnaire.royalty_pct         ?? (franchisor as any).royalty_pct,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            marketing_levy_pct:  questionnaire.marketing_levy_pct  ?? (franchisor as any).marketing_levy_pct,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            experience_required: questionnaire.experience_required ?? (franchisor as any).experience_required,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            full_time_required:  questionnaire.full_time_required  ?? (franchisor as any).full_time_required,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            operating_model_raw: questionnaire.operating_model_raw ?? (franchisor as any).operator_model,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            timeline_months:     questionnaire.timeline_months     ?? (franchisor as any).timeline_months,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            format_types:        questionnaire.format_types        ?? (franchisor as any).format,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            locations_available: questionnaire.locations_available ?? (franchisor as any).locations_available,
          } : null}
          sections={shapedSections}
        />
      </div>
    </div>
  )
}
