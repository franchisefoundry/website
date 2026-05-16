import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  return NextResponse.json({ success: true })
}
