import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MarketplaceView from '../../../components/MarketplaceView'
import type { Partner } from '@/lib/supabase/types'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function FranchiseeMarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: franchisee } = await supabase
    .from('franchisee_profiles')
    .select('tier_2_unlocked')
    .eq('user_id', user.id)
    .single()

  const admin = createAdminClient()
  const { data: partners } = await admin
    .from('partners')
    .select('*')
    .eq('is_active', true)
    .in('audience', ['franchisee', 'both'])
    .order('display_order', { ascending: true })

  const unlocked = franchisee?.tier_2_unlocked ?? false

  return (
    <MarketplaceView
      partners={(partners ?? []) as Partner[]}
      unlocked={unlocked}
      role="franchisee"
    />
  )
}
