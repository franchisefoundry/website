import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runSlaSweep } from '@/lib/foundry/sla-sweep'

/** Called every 15 minutes by the Netlify scheduled function foundry-sla. */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const sent = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const ok = !!secret && sent.length === secret.length && timingSafeEqual(Buffer.from(sent), Buffer.from(secret))
  if (!ok) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const result = await runSlaSweep(createAdminClient())
  return NextResponse.json(result)
}
