import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueInvite } from '@/lib/supabase/issue-invite'
import { sendInviteEmail } from '@/lib/supabase/send-invite-email'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('role', 'introducer')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { full_name, email } = await request.json()
  if (!full_name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const admin = createAdminClient()
  const cleanEmail = email.trim().toLowerCase()
  const cleanName = full_name.trim()

  // Create the auth user (email_confirm:true skips Supabase's own email — we send our own)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: cleanEmail,
    email_confirm: true,
    user_metadata: { full_name: cleanName, role: 'introducer' },
  })

  let userId = created?.user?.id
  if (createError && !createError.message.toLowerCase().includes('already')) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }
  if (!userId) {
    const { data: { users } } = await admin.auth.admin.listUsers()
    userId = users.find(u => u.email === cleanEmail)?.id
  }
  if (!userId) return NextResponse.json({ error: 'Could not create or find user.' }, { status: 500 })

  await admin.from('profiles').upsert({
    id: userId,
    full_name: cleanName,
    email: cleanEmail,
    role: 'introducer',
  }, { onConflict: 'id' })

  // Issue a 72h invite token + email it via Resend (unified flow — same as the
  // other roles). This also creates the invites row so the agent appears in the
  // Agent invites list and can be resent.
  const { token, error: inviteError } = await issueInvite(admin, {
    email: cleanEmail, role: 'introducer', fullName: cleanName, invitedBy: user.id,
  })
  if (inviteError || !token) {
    return NextResponse.json({ error: inviteError ?? 'Could not create invite.' }, { status: 500 })
  }

  const emailError = await sendInviteEmail(cleanEmail, cleanName, token)
  if (emailError) return NextResponse.json({ error: `Could not send invite email: ${emailError}` }, { status: 500 })

  return NextResponse.json({ success: true })
}
