import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  // Generate magic link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: lead.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.franchisefoundry.co.uk'}/auth/callback?next=/setup-account`,
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkError?.message ?? 'Failed to generate invite link' }, { status: 500 })
  }

  // Mark lead as invited
  await admin
    .from('introducer_leads')
    .update({ status: 'invited', invited_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({
    success: true,
    invite_link: linkData.properties.action_link,
    email: lead.email,
  })
}
