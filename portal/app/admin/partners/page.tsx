import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { canSeeFoundry } from '@/lib/foundry/access'
import { PageHeader } from '@/components/page-header'
import { MarketplaceTabs } from '@/components/admin/MarketplaceTabs'
import PartnersClient from './PartnersClient'
import type { Partner } from '@/lib/supabase/types'

export default async function AdminPartnersPage() {
  // With The Foundry visible, the Foundry partner editor replaces the old directory.
  if (await canSeeFoundry()) redirect('/admin/foundry/partners')
  const admin = createAdminClient()
  const { data: partners } = await admin
    .from('partners')
    .select('*')
    .order('display_order', { ascending: true })

  const { count: introRequestCount } = await admin
    .from('intro_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .eq('is_demo', false)

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
