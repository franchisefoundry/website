import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/foundry/require-admin'
import { isUuid, cleanText } from '@/lib/foundry/validate'

/** Who we brief at a partner. Admin only; never exposed publicly. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data } = await ctx.admin.from('partner_contacts').select('id, name, email, phone, role, is_primary')
    .eq('partner_id', id).order('is_primary', { ascending: false }).order('created_at')
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = await req.json().catch(() => ({}))
  const name = cleanText(b?.name, 120)
  const email = cleanText(b?.email, 200)
  if (!name) return NextResponse.json({ error: 'Add a name.' }, { status: 400 })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'That email doesn’t look right.' }, { status: 400 })
  const { count } = await ctx.admin.from('partner_contacts').select('id', { count: 'exact', head: true }).eq('partner_id', id)
  const { data, error } = await ctx.admin.from('partner_contacts').insert({
    partner_id: id, name, email, phone: cleanText(b?.phone, 40), role: cleanText(b?.role, 80),
    is_primary: !count, // first contact becomes primary
  }).select('id, name, email, phone, role, is_primary').single()
  if (error) return NextResponse.json({ error: 'Could not save contact.' }, { status: 500 })
  return NextResponse.json(data)
}
