import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Verify the caller is a franchisor and owns the match
  const { data: brandProfile } = await supabase
    .from('franchisor_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!brandProfile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action } = await request.json() // 'interested' | 'pass'
  if (!['interested', 'pass'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Confirm the match belongs to this franchisor before updating
  const { data: match } = await admin
    .from('matches')
    .select('id, franchisor_id')
    .eq('id', matchId)
    .eq('franchisor_id', brandProfile.id)
    .single()
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  const newStatus = action === 'interested' ? 'interested' : 'declined'
  const { error } = await admin
    .from('matches')
    .update({ status: newStatus })
    .eq('id', matchId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, status: newStatus })
}
