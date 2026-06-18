import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueInvite, inviteUrl } from '@/lib/supabase/issue-invite'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()

  // Get lead details
  const { data: lead, error: leadError } = await admin
    .from('introducer_leads')
    .select('email, first_name, last_name, status')
    .eq('id', id)
    .single()

  if (leadError || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (lead.status === 'invited' || lead.status === 'registered') {
    return NextResponse.json({ error: 'Lead already invited or registered' }, { status: 400 })
  }

  // Create the auth user so the on-demand magic link can be generated at /auth/invite
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || null
  const { error: createError } = await admin.auth.admin.createUser({
    email: lead.email,
    email_confirm: true,
    user_metadata: { full_name: fullName ?? '', role: 'franchisee' },
  })
  if (createError && !createError.message.toLowerCase().includes('already')) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  // Issue a 72h invite token
  const { token, error: inviteError } = await issueInvite(admin, {
    email: lead.email, role: 'franchisee', fullName, invitedBy: user.id,
  })
  if (inviteError || !token) {
    return NextResponse.json({ error: inviteError ?? 'Failed to generate invite link' }, { status: 500 })
  }

  // Mark lead as invited
  await admin
    .from('introducer_leads')
    .update({ status: 'invited', invited_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({
    success: true,
    invite_link: inviteUrl(token),
    email: lead.email,
  })
}
