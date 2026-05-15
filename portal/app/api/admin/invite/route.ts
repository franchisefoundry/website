import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // Verify caller is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  }

  const body = await request.json()
  const { email, full_name, role } = body

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role, full_name: full_name ?? '' },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Log the invite
  await supabase.from('invites').insert({
    email,
    role,
    full_name: full_name ?? null,
    invited_by: user.id,
  })

  return NextResponse.json({ success: true })
}
