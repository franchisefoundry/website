import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // Get the franchisee profile to find user_id + email (for invite cleanup)
  const { data: profile } = await admin
    .from('franchisee_profiles')
    .select('user_id, profiles(email)')
    .eq('id', id)
    .single()

  // Delete profile (cascades matches)
  const { error: profileError } = await admin
    .from('franchisee_profiles')
    .delete()
    .eq('id', id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Remove any lingering invite rows for this person so they don't stack up
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const email = (profile as any)?.profiles?.email as string | undefined
  if (email) await admin.from('invites').delete().eq('email', email)

  // Delete auth user if present
  if (profile?.user_id) {
    await admin.auth.admin.deleteUser(profile.user_id)
    await admin.from('profiles').delete().eq('id', profile.user_id)
  }

  return NextResponse.json({ success: true })
}
