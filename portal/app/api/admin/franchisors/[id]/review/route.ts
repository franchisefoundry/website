import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notifications'

// Admin review decisions → franchisor_profiles.status
// Only 'active' brands appear in matching; the others are held out.
const DECISION_STATUS: Record<string, string> = {
  approve:      'active',
  request_info: 'needs_info',
  reject:       'rejected',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { decision } = await request.json()
  const status = DECISION_STATUS[decision as string]
  if (!status) return NextResponse.json({ error: 'Invalid decision.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: brand, error } = await admin
    .from('franchisor_profiles')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      answers_changed_at: null, // reset the "edited since review" flag
    })
    .eq('id', id)
    .select('user_id, brand_name')
    .single()

  if (error) return NextResponse.json({ error: 'Could not update status.' }, { status: 500 })

  // Let the brand know we need more from them — otherwise they just see the
  // generic "under review" screen and never update their answers.
  if (decision === 'request_info' && brand?.user_id) {
    try {
      await notify({
        userId: brand.user_id,
        event: 'brand_info_requested',
        title: 'We need a bit more info',
        body: `Before ${brand.brand_name ?? 'your brand'} goes live we need a few more details on your questionnaire. Our team will be in touch, or you can update your answers now.`,
        link: '/franchisor/questionnaire',
      })
    } catch (err) {
      // Non-fatal — the status change succeeded regardless.
      console.error('[franchisor review] notify failed', err)
    }
  }

  return NextResponse.json({ success: true, status })
}
