import { NextResponse, type NextRequest } from 'next/server'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { parseQuery } from '@/lib/foundry/parse'

/** Live "Understood" readout as people type. Rules only, no I/O, no logging. */
export async function GET(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  if (rateLimited(request, 240)) return NextResponse.json({ error: 'Slow down a little.' }, { status: 429, headers: cors })

  const q = request.nextUrl.searchParams.get('q') ?? ''
  return NextResponse.json(parseQuery(q), { headers: cors })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
