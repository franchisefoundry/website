import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import LeadsClient from './LeadsClient'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: leads } = await supabase
    .from('introducer_leads')
    .select('*')
    .eq('introducer_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="My Leads"
        description="Manage and track all your submitted candidates."
      />
      <LeadsClient leads={leads ?? []} />
    </div>
  )
}
