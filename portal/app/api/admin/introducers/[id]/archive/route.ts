import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const FOREVER = '876000h'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // for an introducer the record id IS the profile/auth id
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { reason } = await req.json().catch(() => ({}))
  if (!reason) return NextResponse.json({ error: 'A reason is required.' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('profiles')
    .update({ archived_at: new Date().toISOString(), archive_reason: reason })
    .eq('id', id)

  // Revoke portal access.
  await admin.auth.admin.updateUserById(id, { ban_duration: FOREVER })

  return NextResponse.json({ success: true })
}
