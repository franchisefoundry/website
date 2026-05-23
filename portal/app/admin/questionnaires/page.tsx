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

  // Join questionnaires with franchisor profiles for brand name / category
  const { data: questionnaires } = await admin
    .from('franchisor_questionnaires')
    .select('id, franchisor_id, completed_at, created_at, franchisor_profiles(brand_name, category)')
    .order('completed_at', { ascending: false, nullsFirst: false })

  const rows = (questionnaires ?? []).map(q => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fp = q.franchisor_profiles as any
    return {
      id: q.id,
      franchisor_id: q.franchisor_id,
      completed_at: q.completed_at,
      created_at: q.created_at,
      brand_name: fp?.brand_name ?? null,
      category: fp?.category ?? null,
    }
  })

  return (
    <div>
      <PageHeader
        title="Questionnaires"
        description={`${rows.length} brand${rows.length === 1 ? '' : 's'} have submitted onboarding questionnaires.`}
      />
      <QuestionnairesClient rows={rows} />
    </div>
  )
}
