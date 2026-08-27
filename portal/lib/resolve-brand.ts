import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import type { FranchisorProfile } from '@/lib/supabase/types'

/**
 * Resolves the "active brand" for the current viewer:
 *   • admin previewing  → ff_preview_as (a specific brand id)
 *   • franchisor multi-brand → ff_active_brand_id
 *   • franchisor default → their earliest brand
 * Centralises the logic that was copy-pasted across the franchisor pages.
 */
export async function resolveBrand(): Promise<{
  brandProfile: FranchisorProfile | null
  userId: string | null
  role: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { brandProfile: null, userId: null, role: null }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? null
  const admin = createAdminClient()
  const cookieStore = await cookies()
  const previewAs = role === 'admin' ? cookieStore.get('ff_preview_as')?.value : null
  const activeBrandId = role === 'franchisor' ? cookieStore.get('ff_active_brand_id')?.value : null

  const { data: brandProfile } = previewAs
    ? await admin.from('franchisor_profiles').select('*').eq('id', previewAs).single()
    : activeBrandId
      ? await supabase.from('franchisor_profiles').select('*').eq('id', activeBrandId).single()
      : role === 'franchisor'
        ? await supabase.from('franchisor_profiles').select('*').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
        : { data: null }

  return { brandProfile: (brandProfile as FranchisorProfile | null) ?? null, userId: user.id, role }
}
