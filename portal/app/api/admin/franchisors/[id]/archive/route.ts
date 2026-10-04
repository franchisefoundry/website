import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const FOREVER = '876000h'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { reason } = await req.json().catch(() => ({}))
  if (!reason) return NextResponse.json({ error: 'A reason is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: b } = await admin.from('franchisor_profiles').select('user_id').eq('id', id).single()

  // Inactive removes the brand from the matching pool for future runs.
  await admin.from('franchisor_profiles')
    .update({ status: 'inactive', archived_at: new Date().toISOString(), archive_reason: reason })
    .eq('id', id)

  // Withdraw existing open matches/introductions for this brand.
  await admin.from('matches')
    .update({ status: 'declined' })
    .eq('franchisor_id', id)
    .in('status', ['suggested', 'shown', 'interested'])

  // Revoke portal access.
  if (b?.user_id) await admin.auth.admin.updateUserById(b.user_id, { ban_duration: FOREVER })

  return NextResponse.json({ success: true })
}
