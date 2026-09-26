import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { MarketplaceTabs } from '@/components/admin/MarketplaceTabs'
import PartnersClient from './PartnersClient'
import type { Partner } from '@/lib/supabase/types'

export default async function AdminPartnersPage() {
  const admin = createAdminClient()
  const { data: partners } = await admin
    .from('partners')
    .select('*')
    .order('display_order', { ascending: true })

  const { count: introRequestCount } = await admin
    .from('intro_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <div>
      <PageHeader
        title="Marketplace"
        description="Trusted supply-chain partners, intro requests and resales."
      />
      <MarketplaceTabs />
      <PartnersClient
        partners={(partners ?? []) as Partner[]}
        introRequestCount={introRequestCount ?? 0}
      />
    </div>
  )
}
