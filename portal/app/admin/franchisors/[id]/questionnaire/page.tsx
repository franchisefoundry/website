import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import Link from 'next/link'
import AdminQuestionnaireForm from './AdminQuestionnaireForm'
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
    admin.from('franchisor_profiles').select('brand_name, category').eq('id', id).single(),
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
          <div className="flex items-center gap-3">
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
        <AdminQuestionnaireForm franchisorId={id} existing={questionnaire} sections={shapedSections} />
      </div>
    </div>
  )
}
