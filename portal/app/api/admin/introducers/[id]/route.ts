import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // Verify target is an introducer (safety check)
  const { data: target } = await admin.from('profiles').select('role, email').eq('id', id).single()
  if (target?.role !== 'introducer') {
    return NextResponse.json({ error: 'User is not an agent' }, { status: 400 })
  }

  // Remove any lingering invite rows so they don't stack up
  if (target.email) await admin.from('invites').delete().eq('email', target.email)

  // Delete from auth — cascades to profiles and introducer_leads via FK
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
