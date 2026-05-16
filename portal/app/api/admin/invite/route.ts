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

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role, full_name: full_name ?? '' },
    redirectTo,
  })

  if (error) {
    const alreadyExists = error.message.toLowerCase().includes('already')
    if (!alreadyExists) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    // Existing user — send a magic link via the OTP (non-PKCE) flow so the email actually delivers
    const { createClient: createAnonClient } = await import('@supabase/supabase-js')
    const anonClient = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: 'implicit', autoRefreshToken: false, detectSessionInUrl: false } }
    )
    const { error: otpError } = await anonClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    })
    if (otpError) {
      return NextResponse.json({ error: `Could not send login link: ${otpError.message}` }, { status: 500 })
    }
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
