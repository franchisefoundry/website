import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/foundry/require-admin'
import { savePartner } from '@/lib/foundry/partner-save'

/** Create a partner from the editor. */
export async function POST(request: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const res = await savePartner(ctx.admin, null, body)
  if ('errors' in res) return NextResponse.json({ errors: res.errors }, { status: 400 })
  return NextResponse.json(res)
}
