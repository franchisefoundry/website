import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { createApplication } from '@/lib/foundry/applications'

/** Become a partner: public application from the website. */
export async function POST(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  if (rateLimited(request, 5, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many tries. Give it a few minutes.' }, { status: 429, headers: cors })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'That didn’t send. Try a smaller file, or leave it off and send it later.' }, { status: 400, headers: cors })
  const res = await createApplication(createAdminClient(), body, { demo: access.includeDemo })
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: 400, headers: cors })
  return NextResponse.json(res, { headers: cors })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
