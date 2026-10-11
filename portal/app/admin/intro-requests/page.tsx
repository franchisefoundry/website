import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { MarketplaceTabs } from '@/components/admin/MarketplaceTabs'
import { canSeeFoundry } from '@/lib/foundry/access'
import { loadPipeline } from '@/lib/foundry/pipeline'
import { IntroPipeline } from '@/components/foundry/admin/IntroPipeline'

export default async function IntroRequestsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: v } = await searchParams
  const view = v === 'closed' ? 'closed' : v === 'unconfirmed' ? 'unconfirmed' : 'open'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()
  const senderName = me?.full_name?.split(' ')[0] ?? 'The Franchise Foundry team'

  // Demo intros only show to people on the preview list.
  const includeDemo = await canSeeFoundry()
  const admin = createAdminClient()
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
  let monthQ = admin.from('intro_requests').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString())
  if (!includeDemo) monthQ = monthQ.eq('is_demo', false)

  let partnersQ = admin.from('partners').select('id, name, category, is_demo').eq('status', 'live').order('name')
  if (!includeDemo) partnersQ = partnersQ.eq('is_demo', false)
  let unconfirmedQ = admin.from('intro_requests').select('id', { count: 'exact', head: true }).eq('stage', 'awaiting_verification')
  if (!includeDemo) unconfirmedQ = unconfirmedQ.eq('is_demo', false)

  const [cards, { count: monthCount }, { data: partners }, { count: unconfirmed }] = await Promise.all([
    loadPipeline(admin, { includeDemo, view, senderName }),
    monthQ,
    partnersQ,
    unconfirmedQ,
  ])

  return (
    <div>
      <PageHeader title="Marketplace" description="Intro requests: brief partners, chase, and close the loop with members." />
      <MarketplaceTabs />
      <IntroPipeline cards={cards} view={view} senderName={senderName} monthCount={monthCount ?? 0} unconfirmedCount={unconfirmed ?? 0}
        partners={(partners ?? []).map(p => ({ id: p.id, name: p.name, category: p.category, isDemo: p.is_demo }))} serverNow={Date.now()} />
    </div>
  )
}
