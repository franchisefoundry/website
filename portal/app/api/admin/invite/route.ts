import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendMagicLink } from '@/lib/supabase/send-magic-link'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })

  const body = await request.json()
  const { email, full_name, role } = body
  if (!email || !role) return NextResponse.json({ error: 'email and role are required' }, { status: 400 })

  const adminClient = createAdminClient()

  // createUser with email_confirm:true creates the account without sending any Supabase email.
  // We always send our own email via sendMagicLink so every link uses token_hash (no PKCE).
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? '', role },
  })

  let userId = created?.user?.id

  if (createError && !createError.message.toLowerCase().includes('already')) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  if (!userId) {
    const { data: { users } } = await adminClient.auth.admin.listUsers()
    userId = users.find(u => u.email === email)?.id
  }

  if (!userId) return NextResponse.json({ error: 'Could not create or find user.' }, { status: 500 })

  const linkError = await sendMagicLink(email, full_name ?? null, null)
  if (linkError) return NextResponse.json({ error: `Could not send login link: ${linkError}` }, { status: 500 })

  await supabase.from('invites').insert({ email, role, full_name: full_name ?? null, invited_by: user.id })
  return NextResponse.json({ success: true })
}
