import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmins } from '@/lib/notifications'

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
    .select('id, franchisor_id, franchisee_id')
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

  // When a brand expresses interest, alert the admins so a consultant can
  // follow up and arrange the intro. Non-fatal — the response already succeeded.
  if (action === 'interested') {
    try {
      const { data: brand } = await admin
        .from('franchisor_profiles')
        .select('brand_name')
        .eq('id', brandProfile.id)
        .single()

      const { data: fe } = await admin
        .from('franchisee_profiles')
        .select('user_id')
        .eq('id', match.franchisee_id)
        .single()
      const { data: candidate } = fe?.user_id
        ? await admin.from('profiles').select('full_name').eq('id', fe.user_id).single()
        : { data: null }

      const brandName = brand?.brand_name ?? 'A brand'
      const candidateName = candidate?.full_name ?? 'a candidate'

      await notifyAdmins({
        type: 'candidate_interested',
        title: `${brandName} expressed interest`,
        body: `${brandName} is interested in ${candidateName}. Follow up to arrange an intro.`,
        link: '/admin/matches',
      })
    } catch (err) {
      console.error('[respond] admin notify failed', err)
    }
  }

  return NextResponse.json({ success: true, status: newStatus })
}
