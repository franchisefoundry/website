import { NextResponse, type NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryMode } from '@/lib/foundry/access'
import { loadProfilesForBuild } from '@/lib/foundry/data'

/**
 * Partner profiles for the website build (build-foundry.mjs). Server to server
 * only: needs `Authorization: Bearer <FOUNDRY_BUILD_TOKEN>`, set on both sites.
 * Off → no partners. Preview → demo partners only. Live → real partners only.
 */
export async function GET(request: NextRequest) {
  const token = process.env.FOUNDRY_BUILD_TOKEN ?? ''
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const a = Buffer.from(given), b = Buffer.from(token)
  if (!token || a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const mode = foundryMode()
  if (mode === 'off') return NextResponse.json({ mode, partners: [] }, { headers: { 'Cache-Control': 'no-store' } })
  const partners = await loadProfilesForBuild(createAdminClient(), { demo: mode === 'preview' })
  return NextResponse.json({ mode, generatedAt: new Date().toISOString(), partners }, { headers: { 'Cache-Control': 'no-store' } })
}
