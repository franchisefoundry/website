import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { loadPartnerProfile } from '@/lib/foundry/data'

/** Public partner profile for the website. Public fields only. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  if (rateLimited(request, 120)) return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: cors })
  const { slug } = await params
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  const p = await loadPartnerProfile(createAdminClient(), slug, { includeDemo: access.includeDemo })
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  // keywords are internal search hints; don't publish them
  const { keywords: _k, ...pub } = p
  return NextResponse.json(pub, { headers: cors })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
