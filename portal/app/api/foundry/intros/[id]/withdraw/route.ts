import { NextResponse, type NextRequest } from 'next/server'
import { ownIntro } from '@/lib/foundry/own-intro'
import { notifyFoundryTeam } from '@/lib/foundry/notify'
import { OPEN_STAGES, type IntroStage } from '@/lib/foundry/intro-status'

/** Withdraw an open intro (and the consent to share details with that partner). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const own = await ownIntro(request, id)
  if ('error' in own) return NextResponse.json({ error: own.error }, { status: own.status })

  const { admin, access, intro, partnerName } = own
  if (!OPEN_STAGES.includes(intro.stage as IntroStage)) {
    return NextResponse.json({ error: 'This intro is already closed.' }, { status: 400 })
  }
  const now = new Date().toISOString()
  await admin.from('intro_requests').update({ stage: 'withdrawn', status: 'completed', closed_at: now, updated_at: now }).eq('id', intro.id)
  await admin.from('intro_events').insert({
    intro_request_id: intro.id, kind: 'withdrawn', actor_id: access.viewer!.id,
    body: 'You withdrew this intro', visible_to_requester: true,
  })
  await notifyFoundryTeam({
    event: 'intro_request',
    title: `Intro withdrawn: ${partnerName}`,
    body: intro.stage === 'to_brief' ? 'Not briefed yet, nothing to undo.' : 'They may already have been briefed. Let the partner know.',
    link: '/admin/intro-requests',
  }, { demo: intro.is_demo }).catch(err => console.error('[foundry/withdraw] notify failed:', err))
  return NextResponse.json({ ok: true })
}
