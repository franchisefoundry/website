import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notifications'
import { FRANCHISEE_PIPELINE_STAGES } from '@/lib/supabase/types'

/**
 * Admin advances a franchisee's pipeline stage. Runs server-side (instead of a
 * direct client write) so it can notify the franchisee: a generic "pipeline
 * progress" ping for most stages, and a dedicated "meeting confirmed" one when
 * they reach Meeting Booked. Notifies only on a real change, and stays silent
 * for the earliest internal stages the franchisee wouldn't expect a ping about.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: franchiseeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { stage } = await request.json()
  const stageMeta = FRANCHISEE_PIPELINE_STAGES.find(s => s.value === stage)
  if (!stageMeta) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

  const admin = createAdminClient()

  // Read the current stage first so we only notify when it actually moves.
  const { data: current } = await admin
    .from('franchisee_profiles')
    .select('user_id, pipeline_stage')
    .eq('id', franchiseeId)
    .single()

  const { error } = await admin
    .from('franchisee_profiles')
    .update({ pipeline_stage: stage })
    .eq('id', franchiseeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Earliest stages are internal triage — don't ping the franchisee for those.
  const SILENT_STAGES = ['new_enquiry', 'profile_complete']

  if (current?.user_id && current.pipeline_stage !== stage && !SILENT_STAGES.includes(stage)) {
    const isMeeting = stage === 'meeting_booked'
    try {
      await notify({
        userId: current.user_id,
        event: isMeeting ? 'meeting_booked' : 'stage_updated',
        title: isMeeting ? 'Your meeting is confirmed' : `Pipeline update — ${stageMeta.label}`,
        body: isMeeting
          ? 'A meeting with your matched brand has been booked. Open your portal for the details.'
          : `Your application has moved to "${stageMeta.label}". View your progress in the portal.`,
        link: '/franchisee',
      })
    } catch (err) {
      // Non-fatal — the stage change succeeded regardless.
      console.error('[franchisee stage] notify failed', err)
    }
  }

  return NextResponse.json({ success: true })
}
