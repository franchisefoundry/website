import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryAccess, corsHeaders, rateLimited } from '@/lib/foundry/access'
import { trackerUrl } from '@/lib/foundry/tracker'
import { sendTrackerEmail } from '@/lib/foundry/visitor-email'
import { cleanText } from '@/lib/foundry/validate'

/** "Email me my link". Always answers the same way, so it can't be used to test which emails exist. */
export async function POST(request: NextRequest) {
  const cors = corsHeaders(request)
  const access = await foundryAccess(request)
  if (!access.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  if (rateLimited(request, 5)) return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: cors })
  const body = await request.json().catch(() => ({}))
  const email = cleanText(body?.email, 200)?.toLowerCase()
  const done = NextResponse.json({ ok: true, message: 'If we have intros for that email, the link is on its way.' }, { headers: cors })
  if (!email) return done

  const admin = createAdminClient()
  const { data: contact } = await admin.from('foundry_contacts').select('id, name, email').eq('email', email).maybeSingle()
  if (!contact) return done
  const { data: batches } = await admin.from('intro_batches').select('id, created_at')
    .eq('contact_id', contact.id).not('verified_at', 'is', null).order('created_at', { ascending: false }).limit(10)
  if (!batches?.length) return done
  await sendTrackerEmail(contact.email, contact.name, batches.map(b => ({
    label: `Intros requested ${new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`,
    url: trackerUrl(b.id),
  }))).catch(e => console.error('[foundry/resend] email failed', e))
  return done
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
