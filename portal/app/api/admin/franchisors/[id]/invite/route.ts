import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: callerProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name } = body

    if (!email || !name) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`

    // Try to invite — works for new users
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo,
    })

    let userId = inviteData?.user?.id

    if (inviteError) {
      const alreadyExists = inviteError.message.toLowerCase().includes('already')
      if (!alreadyExists) {
        return NextResponse.json({ error: inviteError.message }, { status: 500 })
      }

      // User already exists — look them up and send a magic link instead
      const { data: { users } } = await admin.auth.admin.listUsers()
      const existing = users.find(u => u.email === email)
      userId = existing?.id

      if (!userId) {
        return NextResponse.json({ error: 'Could not find or create user.' }, { status: 500 })
      }

      // Send a magic link via the OTP (non-PKCE) flow so the email actually delivers
      // Note: generateLink() does NOT send emails — it's for custom providers only
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

    if (!userId) {
      return NextResponse.json({ error: 'Could not find or create user.' }, { status: 500 })
    }

    // Ensure profile record exists with correct role
    await admin.from('profiles').upsert({
      id: userId, email, full_name: name, role: 'franchisor',
    }, { onConflict: 'id' })

    // Link brand profile to user
    await admin
      .from('franchisor_profiles')
      .update({ user_id: userId, contact_email: email, contact_name: name })
      .eq('id', id)

    // Log the invite
    await admin.from('invites').insert({
      email, role: 'franchisor', full_name: name, invited_by: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
