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
        title="Introducer Leads"
        description="Leads submitted by introducers — review and approve or reject."
      />
      <IntroducerLeadsClient leads={leads ?? []} />
    </div>
  )
}
