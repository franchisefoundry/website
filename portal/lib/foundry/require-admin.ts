import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** Signed-in admin, with a service-role client, or null. */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role, full_name, email').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return {
    admin: createAdminClient(),
    actor: { id: user.id, name: profile.full_name?.split(' ')[0] || profile.email || 'Admin' },
  }
}
