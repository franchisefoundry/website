import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/foundry/require-admin'
import { performApplicationAction, CHECKS, TRUST_LEVELS, type ApplicationAction } from '@/lib/foundry/applications'
import { isUuid } from '@/lib/foundry/validate'

/** Vet an application: tick checks, set trust, notes, approve or decline. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = await request.json().catch(() => ({}))
  let act: ApplicationAction | null = null
  switch (b?.action) {
    case 'check': if (CHECKS.some(c => c.k === b.key)) act = { action: 'check', key: b.key, on: b.on === true }; break
    case 'refs': if (Number.isFinite(Number(b.called))) act = { action: 'refs', called: Number(b.called) }; break
    case 'trust': if (TRUST_LEVELS.some(([k]) => k === b.level)) act = { action: 'trust', level: b.level }; break
    case 'notes': act = { action: 'notes', body: String(b.body ?? '') }; break
    case 'approve': act = { action: 'approve' }; break
    case 'decline': act = { action: 'decline', message: typeof b.message === 'string' && b.message.trim() ? b.message.trim().slice(0, 4000) : null }; break
  }
  if (!act) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })

  const res = await performApplicationAction(ctx.admin, id, act, ctx.actor)
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json(res)
}
