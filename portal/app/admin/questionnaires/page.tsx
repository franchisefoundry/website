import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { redirect } from 'next/navigation'
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
      />
      <QuestionnairesClient rows={rows} />
    </div>
  )
}
