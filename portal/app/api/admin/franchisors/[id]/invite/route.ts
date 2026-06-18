import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueInvite } from '@/lib/supabase/issue-invite'
import { sendInviteEmail } from '@/lib/supabase/send-invite-email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'admin') return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })

    const body = await request.json()
    const { email, name } = body
    if (!email || !name) return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })

    const admin = createAdminClient()

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name, role: 'franchisor' },
    })

    let userId = created?.user?.id

    if (createError && !createError.message.toLowerCase().includes('already')) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    if (!userId) {
      const { data: { users } } = await admin.auth.admin.listUsers()
      userId = users.find(u => u.email === email)?.id
    }

    if (!userId) return NextResponse.json({ error: 'Could not find or create user.' }, { status: 500 })

    await admin.from('profiles').upsert(
      { id: userId, email, full_name: name, role: 'franchisor' },
      { onConflict: 'id' }
    )

    await admin.from('franchisor_profiles')
      .update({ user_id: userId, contact_email: email, contact_name: name })
      .eq('id', id)

    // Issue a 72h invite token and email it via Resend (unified account-creation path)
    const { token, error: inviteError } = await issueInvite(admin, {
      email, role: 'franchisor', fullName: name, invitedBy: user.id,
    })
    if (inviteError || !token) {
      return NextResponse.json({ error: inviteError ?? 'Could not create invite.' }, { status: 500 })
    }

    const emailError = await sendInviteEmail(email, name, token)
    if (emailError) return NextResponse.json({ error: `Could not send invite email: ${emailError}` }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
