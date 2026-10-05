import { createClient } from '@/lib/supabase/server'
import type { Partner } from '@/lib/supabase/types'
import FoundryMarketplace from '@/components/foundry/FoundryMarketplace'

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: partners } = await supabase
    .from('partners')
    .select('*')
    .eq('is_active', true)
    .in('audience', ['franchisee', 'both'])
    .order('display_order')

  let brandName: string | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    brandName = profile?.full_name ?? null
  }

  const list = (partners ?? []) as Partner[]
  const stats = {
    partners: list.length,
    deals: list.filter(p => p.offer_text).length,
    categories: new Set(list.map(p => p.category)).size,
  }

  return <FoundryMarketplace partners={list} context={{ brandName, role: 'franchisee' }} stats={stats} />
}
