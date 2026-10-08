import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDirectMessage } from '@/lib/direct-messages'

/**
 * POST /api/dm  { body, conversation_id? , recipient_id? }
 * Person-to-person message (admin ↔ admin, revealed franchisee ↔ brand).
 * Permission is enforced in sendDirectMessage.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { body, conversation_id, recipient_id } = await req.json().catch(() => ({}))
  let senderName = profile.full_name || 'Someone'
  if (profile.role === 'franchisor') {
    // Brands show up under their brand name
    const { data: brand } = await supabase.from('franchisor_profiles').select('brand_name').eq('user_id', user.id).order('created_at').limit(1).maybeSingle()
    if (brand?.brand_name) senderName = brand.brand_name
  }

  const result = await sendDirectMessage({
    senderId: user.id,
    senderRole: profile.role,
    senderName,
    body: String(body ?? ''),
    conversationId: conversation_id ?? null,
    recipientId: recipient_id ?? null,
  })
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true, conversation_id: result.conversationId })
}
