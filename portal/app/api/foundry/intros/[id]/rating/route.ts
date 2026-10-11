import { NextResponse, type NextRequest } from 'next/server'
import { ownIntro } from '@/lib/foundry/own-intro'
import { notifyFoundryTeam } from '@/lib/foundry/notify'
import { RATINGS, type Rating } from '@/lib/foundry/intro-status'
import { cleanText } from '@/lib/foundry/validate'

/** Private rating of an intro. Only the team sees it; it feeds partner quality. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const own = await ownIntro(request, id)
  if ('error' in own) return NextResponse.json({ error: own.error }, { status: own.status })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await request.json().catch(() => ({}))
  const rating = RATINGS.find(([k]) => k === body?.rating)?.[0] as Rating | undefined
  if (!rating) return NextResponse.json({ error: 'Choose a rating.' }, { status: 400 })
  const note = cleanText(body?.note, 1000)

  const { admin, access, intro, partnerName } = own
  await admin.from('intro_requests').update({ rating, updated_at: new Date().toISOString() }).eq('id', intro.id)
  await admin.from('intro_events').insert({
    intro_request_id: intro.id,
    kind: 'rated',
    actor_id: access.viewer!.id,
    body: `Member rated it: ${RATINGS.find(([k]) => k === rating)![1]}${note ? `. “${note}”` : ''}`,
    visible_to_requester: false,
  })
  if (rating !== 'going_well') {
    await notifyFoundryTeam({
      event: 'intro_request',
      title: `${partnerName}: ${rating === 'slow' ? 'slow to reply' : 'not a fit'}`,
      body: note ?? 'A member flagged an intro. Worth a chase.',
      link: '/admin/intro-requests',
    }, { demo: intro.is_demo }).catch(err => console.error('[foundry/rating] notify failed:', err))
  }
  return NextResponse.json({ ok: true, rating })
}
