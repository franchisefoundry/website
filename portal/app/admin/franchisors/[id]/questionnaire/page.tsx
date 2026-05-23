import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import Link from 'next/link'
import AdminQuestionnaireForm from './AdminQuestionnaireForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FranchisorQuestionnairePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()

  const [{ data: franchisor }, { data: questionnaire }] = await Promise.all([
    admin.from('franchisor_profiles').select('brand_name, category').eq('id', id).single(),
    admin.from('franchisor_questionnaires').select('*').eq('franchisor_id', id).single(),
  ])

  if (!franchisor) notFound()

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
          <Link
            href={`/admin/franchisors/${id}`}
            className="text-sm text-slate-500 border border-slate-300 hover:border-slate-400 px-4 py-2 rounded-lg transition-colors"
          >
            ← Brand profile
          </Link>
        }
      />

      <div className="max-w-3xl">
        <AdminQuestionnaireForm franchisorId={id} existing={questionnaire} />
      </div>
    </div>
  )
}
