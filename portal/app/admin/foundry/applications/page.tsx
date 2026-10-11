import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { MarketplaceTabs } from '@/components/admin/MarketplaceTabs'
import { foundryMode } from '@/lib/foundry/access'
import { loadApplications, declineDraft } from '@/lib/foundry/applications'
import { ApplicationsBoard } from '@/components/foundry/admin/ApplicationsBoard'

export const metadata = { title: 'Applications · Franchise Foundry' }

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; id?: string }> }) {
  const { view: v, id } = await searchParams
  const view = v === 'decided' ? 'decided' : 'open'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()
  const sender = me?.full_name?.split(' ')[0] ?? 'The Franchise Foundry team'
  const apps = await loadApplications(createAdminClient(), { includeDemo: foundryMode() === 'preview', view })
  return (
    <div>
      <PageHeader title="Marketplace" description="Partner applications from the Become a partner page. Reply within 3 working days." />
      <MarketplaceTabs />
      <ApplicationsBoard apps={apps} view={view} initialId={id ?? null} declineDrafts={Object.fromEntries(apps.map(a => [a.id, declineDraft(a.company, a.contact.name, sender)]))} serverNow={Date.now()} />
    </div>
  )
}
