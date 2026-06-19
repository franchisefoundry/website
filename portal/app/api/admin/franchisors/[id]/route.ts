import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'admin'
}

// Unlink (remove portal access) — keeps franchisor profile, deletes auth user + profiles row
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!await verifyAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: fp } = await admin
    .from('franchisor_profiles')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!fp?.user_id) return NextResponse.json({ error: 'No linked user' }, { status: 404 })

  // Remove auth user + profiles row, but keep franchisor_profiles with user_id = null
  await Promise.allSettled([
    admin.auth.admin.deleteUser(fp.user_id),
    admin.from('profiles').delete().eq('id', fp.user_id),
  ])

  await admin.from('franchisor_profiles').update({ user_id: null }).eq('id', id)

  return NextResponse.json({ success: true })
}

// Full delete — removes franchisor profile + auth user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!await verifyAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: fp } = await admin
    .from('franchisor_profiles')
    .select('user_id, profiles(email)')
    .eq('id', id)
    .single()

  const { error } = await admin.from('franchisor_profiles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const email = (fp as any)?.profiles?.email as string | undefined
  if (email) await admin.from('invites').delete().eq('email', email)

  if (fp?.user_id) {
    await admin.auth.admin.deleteUser(fp.user_id)
    await admin.from('profiles').delete().eq('id', fp.user_id)
  }

  return NextResponse.json({ success: true })
}
