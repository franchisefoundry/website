import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Validate UUID format — prevents probing with arbitrary strings
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const supabase = createAdminClient()

  // Verify the lead exists and is in a requestable state (idempotency guard)
  const { data: lead } = await supabase
    .from('leads')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  // Idempotent — already requested is a success from the caller's perspective
  if (lead.status === 'meeting_requested') {
    return NextResponse.json({ success: true })
  }

  // Only allow transition from known pre-request states
  const allowedStatuses = ['new', 'viewed', 'matched']
  if (!allowedStatuses.includes(lead.status)) {
    return NextResponse.json({ error: 'Not available.' }, { status: 409 })
  }

  const { error } = await supabase
    .from('leads')
    .update({ status: 'meeting_requested' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Could not update status.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
