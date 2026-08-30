import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notifications'

/**
 * POST /api/admin/matches/[id]/reveal  { revealed: boolean }
 * Sets reveal-gating (matches.franchisor_revealed) AND, when revealing, notifies
 * the brand that a new candidate is visible to them.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { revealed } = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data: match } = await admin
    .from('matches')
    .select('franchisor_profiles(user_id, brand_name), franchisee_profiles(profiles!franchisee_profiles_user_id_fkey(full_name))')
    .eq('id', id).single()

  await admin.from('matches').update({ franchisor_revealed: !!revealed }).eq('id', id)

  if (revealed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fr = (match as any)?.franchisor_profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidate = (match as any)?.franchisee_profiles?.profiles?.full_name ?? 'A new candidate'
    if (fr?.user_id) {
      try {
        await notify({
          userId: fr.user_id,
          event: 'candidate_matched',
          title: 'New candidate matched',
          body: `${candidate} has been matched to ${fr.brand_name ?? 'your brand'}.`,
          link: '/franchisor/matches',
        })
      } catch (e) { console.error('[reveal] notify failed', e) }
    }
  }

  return NextResponse.json({ success: true })
}
