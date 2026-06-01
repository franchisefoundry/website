import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Only allow updating notes — other fields updated by admin
  const { error } = await supabase
    .from('introducer_leads')
    .update({ introducer_notes: body.introducer_notes ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('introducer_id', user.id) // RLS reinforcement

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
