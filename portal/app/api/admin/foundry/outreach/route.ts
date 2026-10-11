import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/foundry/require-admin'
import { cleanText } from '@/lib/foundry/validate'
import { NEEDS } from '@/lib/foundry/taxonomy'

/** Recruit list: add an unanswered search, or tick one off. */
export async function POST(request: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = await request.json().catch(() => ({}))
  const query = cleanText(b?.query, 300)
  if (!query) return NextResponse.json({ error: 'Nothing to add.' }, { status: 400 })
  const demo = b?.demo === true
  const { data: existing } = await ctx.admin.from('foundry_outreach').select('id, status').ilike('query', query.replace(/[\\%_]/g, '\\$&')).eq('is_demo', demo).maybeSingle()
  if (existing) {
    await ctx.admin.from('foundry_outreach').update({ status: existing.status === 'todo' ? 'done' : 'todo' }).eq('id', existing.id)
    return NextResponse.json({ ok: true, status: existing.status === 'todo' ? 'done' : 'todo' })
  }
  const { error } = await ctx.admin.from('foundry_outreach').insert({
    query, need: NEEDS.includes(b?.need) ? b.need : null, area: cleanText(b?.area, 80),
    searches: Math.max(0, Math.round(Number(b?.searches) || 0)), created_by: ctx.actor.id, is_demo: demo,
  })
  if (error) return NextResponse.json({ error: 'Could not add that.' }, { status: 400 })
  return NextResponse.json({ ok: true, status: 'todo' })
}
