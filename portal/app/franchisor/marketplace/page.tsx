import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MarketplaceView from '../../../components/MarketplaceView'
import type { Partner } from '@/lib/supabase/types'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function FranchisorMarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { data: franchisor } = await supabase
    .from('franchisor_profiles')
    .select('marketplace_unlocked')
    .eq('user_id', user.id)
    .single()

  const adminClient = createAdminClient()
  const { data: partners } = await adminClient
    .from('partners')
    .select('*')
    .eq('is_active', true)
    .in('audience', ['franchisor', 'both'])
    .order('display_order', { ascending: true })

  // Admins see it unlocked by default (they can toggle in the preview banner)
  const unlocked = isAdmin ? true : (franchisor?.marketplace_unlocked ?? false)

  return (
    <MarketplaceView
      partners={(partners ?? []) as Partner[]}
      unlocked={unlocked}
      isAdmin={isAdmin}
      role="franchisor"
    />
  )
}
