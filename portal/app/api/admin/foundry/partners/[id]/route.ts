import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/foundry/require-admin'
import { savePartner } from '@/lib/foundry/partner-save'
import { isUuid } from '@/lib/foundry/validate'

/** Save a partner from the editor. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await request.json().catch(() => null)
  const res = await savePartner(ctx.admin, id, body)
  if ('errors' in res) return NextResponse.json({ errors: res.errors }, { status: 400 })
  return NextResponse.json(res)
}
