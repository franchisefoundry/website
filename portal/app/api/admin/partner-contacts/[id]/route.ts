import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/foundry/require-admin'
import { isUuid } from '@/lib/foundry/validate'

/** Make a contact primary, or remove it. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const b = await req.json().catch(() => ({}))
  if (b?.is_primary !== true) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 })
  const { data: c } = await ctx.admin.from('partner_contacts').select('partner_id').eq('id', id).maybeSingle()
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await ctx.admin.from('partner_contacts').update({ is_primary: false }).eq('partner_id', c.partner_id).neq('id', id)
  await ctx.admin.from('partner_contacts').update({ is_primary: true }).eq('id', id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await ctx.admin.from('partner_contacts').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
