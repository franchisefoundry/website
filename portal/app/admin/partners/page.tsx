import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import PartnersClient from './PartnersClient'
import type { Partner } from '@/lib/supabase/types'

export default async function AdminPartnersPage() {
  const admin = createAdminClient()
  const { data: partners } = await admin
    .from('partners')
    .select('*')
    .order('display_order', { ascending: true })

  return (
    <div>
      <PageHeader
        title="Marketplace partners"
        description="Trusted supply chain partners shown in the franchisee and franchisor marketplace."
      />
      <PartnersClient partners={(partners ?? []) as Partner[]} />
    </div>
  )
}
