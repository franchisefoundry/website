import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MarketplaceView from '../../../components/MarketplaceView'
import type { Partner } from '@/lib/supabase/types'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function FranchisorMarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: franchisor } = await supabase
    .from('franchisor_profiles')
    .select('marketplace_unlocked')
    .eq('user_id', user.id)
    .single()

  const admin = createAdminClient()
  const { data: partners } = await admin
    .from('partners')
    .select('*')
    .eq('is_active', true)
    .in('audience', ['franchisor', 'both'])
    .order('display_order', { ascending: true })

  const unlocked = franchisor?.marketplace_unlocked ?? false

  return (
    <MarketplaceView
      partners={(partners ?? []) as Partner[]}
      unlocked={unlocked}
      role="franchisor"
    />
  )
}
