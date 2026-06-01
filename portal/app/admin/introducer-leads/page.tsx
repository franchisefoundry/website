import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import IntroducerLeadsClient from './IntroducerLeadsClient'

export default async function AdminIntroducerLeadsPage() {
  const admin = createAdminClient()

  const { data: leads } = await admin
    .from('introducer_leads')
    .select('*, profiles!introducer_leads_introducer_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Agent Leads"
        description="Leads submitted by agents — monitor pipeline progress."
      />
      <IntroducerLeadsClient leads={leads ?? []} />
    </div>
  )
}
