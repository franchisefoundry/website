import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

/**
 * Diagnostic endpoint — admin only.
 * GET /api/admin/test-email?to=someone@example.com
 * Returns a detailed JSON trace of every step so you can see exactly where delivery fails.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'admin') return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })

  const to = request.nextUrl.searchParams.get('to')
  if (!to) return NextResponse.json({ error: 'Pass ?to=email@example.com' }, { status: 400 })

  const trace: Record<string, unknown> = {
    step1_env: {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? `set (${process.env.RESEND_API_KEY.slice(0, 10)}…)` : 'MISSING',
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? 'not set (will use team@franchisefoundry.co.uk)',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'MISSING',
    },
  }

  // Step 2 — generate magic link
  const admin = createAdminClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: to,
    options: { redirectTo },
  })

  trace.step2_generateLink = {
    error: linkError ? { message: linkError.message, status: linkError.status } : null,
    hasActionLink: !!(linkData as { properties?: { action_link?: string } })?.properties?.action_link,
    propertiesKeys: linkData ? Object.keys((linkData as Record<string, unknown>).properties ?? {}) : [],
  }

  if (linkError) {
    return NextResponse.json({ ...trace, verdict: 'FAILED at generateLink', reason: linkError.message })
  }

  const actionLink = (linkData as { properties?: { action_link?: string } })?.properties?.action_link
  if (!actionLink) {
    return NextResponse.json({ ...trace, verdict: 'FAILED — generateLink returned no action_link', raw_data_keys: Object.keys(linkData ?? {}) })
  }

  // Step 3 — send via Resend
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const from = `Franchise Foundry <${process.env.RESEND_FROM_EMAIL ?? 'team@franchisefoundry.co.uk'}>`

  const { data: sendData, error: sendError } = await resend.emails.send({
    from,
    to,
    subject: '[TEST] Franchise Foundry portal access',
    html: `<p>This is a diagnostic test email. If you receive this, Resend is working correctly.</p><p>Magic link: <a href="${actionLink}">${actionLink}</a></p>`,
  })

  trace.step3_resend = {
    from,
    to,
    error: sendError ? { name: sendError.name, message: sendError.message } : null,
    data: sendData ?? null,
  }

  const verdict = sendError
    ? `FAILED at Resend send: ${sendError.message}`
    : 'SUCCESS — email sent, check inbox (and spam)'

  return NextResponse.json({ ...trace, verdict })
}
