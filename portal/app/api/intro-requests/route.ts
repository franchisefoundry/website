import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendIntroRequestNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { partner_id, message } = await request.json()
  if (!partner_id) return NextResponse.json({ error: 'partner_id is required' }, { status: 400 })

  const { error } = await supabase.from('intro_requests').insert({
    requester_id: user.id,
    partner_id,
    message: message || null,
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email notification to admin — fire and forget, don't block response
  const admin = createAdminClient()
  const [{ data: requesterProfile }, { data: partner }] = await Promise.all([
    admin.from('profiles').select('full_name, email').eq('id', user.id).single(),
    admin.from('partners').select('name').eq('id', partner_id).single(),
  ])

  sendIntroRequestNotification({
    requesterName: requesterProfile?.full_name ?? 'Unknown user',
    requesterEmail: requesterProfile?.email ?? user.email ?? '',
    partnerName: partner?.name ?? 'Unknown partner',
    message: message || null,
  }).catch(err => console.error('Intro request email failed:', err))

  return NextResponse.json({ success: true })
}
