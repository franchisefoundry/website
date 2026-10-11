import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess } from './access'
import { isUuid } from './validate'

/** Load an intro the signed-in member owns, or say why not. */
export async function ownIntro(request: NextRequest, id: string) {
  const access = await foundryAccess(request)
  if (!access.allowed) return { error: 'Not found', status: 404 } as const
  if (!access.viewer) return { error: 'Please sign in.', status: 401 } as const
  if (!isUuid(id)) return { error: 'Not found', status: 404 } as const
  const admin = createAdminClient()
  const { data } = await admin.from('intro_requests')
    .select('id, stage, rating, is_demo, requester_id, partners(name)')
    .eq('id', id).maybeSingle()
  if (!data || data.requester_id !== access.viewer.id) return { error: 'Not found', status: 404 } as const
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partnerName: string = (data as any).partners?.name ?? 'a partner'
  return { admin, access, intro: data, partnerName } as const
}
