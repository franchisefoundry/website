import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch lead — must belong to this introducer
  const { data: lead, error: leadError } = await supabase
    .from('introducer_leads')
    .select('id, email, first_name, last_name, status, introducer_id')
    .eq('id', id)
    .eq('introducer_id', user.id)
    .single()

  if (leadError || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (lead.status !== 'submitted') return NextResponse.json({ error: 'Already invited' }, { status: 400 })

  // Generate magic link for the lead
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: lead.email.trim().toLowerCase(),
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.franchisefoundry.co.uk'}/auth/callback?next=/setup-account`,
      data: { full_name: `${lead.first_name} ${lead.last_name}` },
    },
  })

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

  // Mark as invited
  await admin
    .from('introducer_leads')
    .update({ status: 'invited', invited_at: new Date().toISOString() })
    .eq('id', id)

  // Create in-app notification for the introducer
  await admin.from('notifications').insert({
    user_id: user.id,
    type: 'lead_invited',
    title: 'Invite sent',
    body: `You sent an invite to ${lead.first_name} ${lead.last_name}.`,
    link: '/introducer/leads',
  })

  return NextResponse.json({
    success: true,
    invite_link: linkData?.properties?.action_link ?? null,
  })
}
