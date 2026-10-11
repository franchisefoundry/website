import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/foundry/require-admin'
import { performIntroAction, type IntroAction } from '@/lib/foundry/pipeline'
import { isUuid } from '@/lib/foundry/validate'

/**
 * Move an intro through the pipeline: brief, chase, contacted, ask_outcome, close, note,
 * assign (pick or swap the partner), resend_verify, convert_lead.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = await request.json().catch(() => ({}))
  let act: IntroAction | null = null
  switch (b?.action) {
    case 'brief': act = { action: 'brief', to: String(b.to ?? '').trim(), subject: typeof b.subject === 'string' ? b.subject : undefined, body: String(b.body ?? '') }; break
    case 'chase': act = { action: 'chase', to: String(b.to ?? '').trim(), body: String(b.body ?? '') }; break
    case 'contacted': act = { action: 'contacted' }; break
    case 'ask_outcome': act = { action: 'ask_outcome' }; break
    case 'close': if (['hired', 'not_hired', 'undecided'].includes(b.outcome)) act = { action: 'close', outcome: b.outcome }; break
    case 'note': act = { action: 'note', body: String(b.body ?? '') }; break
    case 'assign': if (isUuid(b.partnerId)) act = { action: 'assign', partnerId: b.partnerId }; break
    case 'resend_verify': act = { action: 'resend_verify' }; break
    case 'convert_lead': act = { action: 'convert_lead' }; break
  }
  if (!act) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })

  const res = await performIntroAction(ctx.admin, id, act, ctx.actor)
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
