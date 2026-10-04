import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import QuestionnairesClient from './QuestionnairesClient'

export default async function QuestionnairesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Fetch all brands + their questionnaire (if any)
  const [{ data: allBrands }, { data: questionnaires }] = await Promise.all([
    admin.from('franchisor_profiles').select('id, brand_name, category').order('brand_name'),
    admin.from('franchisor_questionnaires').select('id, franchisor_id, completed_at, created_at'),
  ])

  const questionnaireMap = new Map((questionnaires ?? []).map(q => [q.franchisor_id, q]))

  const rows = (allBrands ?? []).map(brand => {
    const q = questionnaireMap.get(brand.id)
    return {
      id: q?.id ?? null,
      franchisor_id: brand.id,
      completed_at: q?.completed_at ?? null,
      created_at: q?.created_at ?? null,
      brand_name: brand.brand_name,
      category: brand.category,
      has_submission: !!q,
    }
  })

  const submitted = rows.filter(r => r.has_submission).length

  return (
    <div>
      <PageHeader
        title="Questionnaires"
        description={`${submitted} of ${rows.length} brands have submitted questionnaire answers.`}
        action={
          <Link href="/admin/questionnaire-template"
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors">
            Manage questions →
          </Link>
        }
      />
      <QuestionnairesClient rows={rows} />
    </div>
  )
}
