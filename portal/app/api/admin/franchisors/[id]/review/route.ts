import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const { error } = await admin
    .from('franchisor_profiles')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      answers_changed_at: null, // reset the "edited since review" flag
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Could not update status.' }, { status: 500 })

  return NextResponse.json({ success: true, status })
}
