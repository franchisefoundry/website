import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ClientThread {
  threadType: 'franchisee' | 'franchisor' | 'introducer'
  threadId: string
  role: string
  userId: string
  name: string
}

/**
 * Resolves the signed-in client's own message thread (type + record id). Used by
 * the client Messages page + send API so a franchisee/brand/agent only ever
 * touches their own conversation. Messages are admin-RLS, so all access is
 * server-mediated after this ownership check.
 */
export async function getClientThread(): Promise<ClientThread | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  const role = profile?.role
  const admin = createAdminClient()

  if (role === 'franchisee') {
    const { data } = await admin.from('franchisee_profiles').select('id').eq('user_id', user.id).order('created_at').limit(1)
    const id = data?.[0]?.id
    return id ? { threadType: 'franchisee', threadId: id, role, userId: user.id, name: profile?.full_name ?? 'You' } : null
  }
  if (role === 'franchisor') {
    const { data } = await admin.from('franchisor_profiles').select('id, brand_name').eq('user_id', user.id).order('created_at').limit(1)
    const row = data?.[0]
    return row ? { threadType: 'franchisor', threadId: row.id, role, userId: user.id, name: row.brand_name ?? profile?.full_name ?? 'You' } : null
  }
  if (role === 'introducer') {
    return { threadType: 'introducer', threadId: user.id, role, userId: user.id, name: profile?.full_name ?? 'You' }
  }
  return null
}
