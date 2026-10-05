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
    .in('audience', ['franchisor', 'both'])
    .order('display_order')

  let brandName: string | null = null
  if (user) {
    const { data: brand } = await supabase
      .from('franchisor_profiles')
      .select('brand_name')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    brandName = brand?.brand_name ?? null
  }

  const list = (partners ?? []) as Partner[]
  const stats = {
    partners: list.length,
    deals: list.filter(p => p.offer_text).length,
    categories: new Set(list.map(p => p.category)).size,
  }

  return <FoundryMarketplace partners={list} context={{ brandName, role: 'franchisor' }} stats={stats} />
}
