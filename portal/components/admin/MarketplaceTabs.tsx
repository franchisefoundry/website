import { canSeeFoundry, foundryMode } from '@/lib/foundry/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { MarketplaceTabsClient } from './MarketplaceTabsClient'

/**
 * Shared sub-nav so the marketplace admin reads as one section. With The
 * Foundry visible it adds Applications and Search insights.
 */
export async function MarketplaceTabs() {
  const foundry = await canSeeFoundry()
  const tabs: { href: string; label: string; badge?: number; exact?: boolean }[] = [
    foundry ? { href: '/admin/foundry/partners', label: 'Partners' } : { href: '/admin/partners', label: 'Directory' },
    { href: '/admin/intro-requests', label: 'Requests' },
  ]
  if (foundry) {
    tabs.unshift({ href: '/admin/foundry', label: 'Marketplace', exact: true })
    let q = createAdminClient().from('partner_applications').select('id', { count: 'exact', head: true }).in('status', ['new', 'vetting'])
    if (foundryMode() !== 'preview') q = q.eq('is_demo', false)
    const { count } = await q
    tabs.push({ href: '/admin/foundry/applications', label: 'Applications', badge: count ?? 0 })
    tabs.push({ href: '/admin/foundry/insights', label: 'Search insights' })
  }
  tabs.push({ href: '/admin/resales', label: 'Resales' })
  return <MarketplaceTabsClient tabs={tabs} />
}
