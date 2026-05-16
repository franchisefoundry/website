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
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role, full_name: full_name ?? '' },
    redirectTo,
  })

  if (error) {
    if (!error.message.toLowerCase().includes('already')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    // Existing user — send a magic link email instead
    const linkError = await sendMagicLink(email, redirectTo)
    if (linkError) return NextResponse.json({ error: `Could not send login link: ${linkError}` }, { status: 500 })
  }

  await supabase.from('invites').insert({ email, role, full_name: full_name ?? null, invited_by: user.id })
  return NextResponse.json({ success: true })
}
