import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureReferralCode, referralLink, setReferralCode } from '@/lib/referral'
import { sendReferralLinkEmail } from '@/lib/email/referral-email'

async function requireAdmin(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  const admin = createAdminClient()
  const { data: agent } = await admin.from('profiles').select('id, email, full_name, role').eq('id', id).single()
  if (!agent || agent.role !== 'introducer') return { error: NextResponse.json({ error: 'Agent not found.' }, { status: 404 }) }
  return { admin, agent }
}

/**
 * PATCH /api/admin/introducers/[id]/referral  { code }
 * Sets a custom (personalised) referral code for the agent.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireAdmin(id)
  if ('error' in ctx) return ctx.error

  const { code: desired } = await req.json().catch(() => ({ code: '' }))
  if (!desired || typeof desired !== 'string') {
    return NextResponse.json({ error: 'A code is required.' }, { status: 400 })
  }

  const result = await setReferralCode(ctx.admin, id, desired)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json({ success: true, code: result.code, link: referralLink(result.code!) })
}

/**
 * POST /api/admin/introducers/[id]/referral
 * Emails the agent their referral link. Returns the link for display/copy.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: agent } = await admin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', id)
    .single()

  if (!agent || agent.role !== 'introducer') {
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
  }
  if (!agent.email) {
    return NextResponse.json({ error: 'Agent has no email on file.' }, { status: 400 })
  }

  const code = await ensureReferralCode(admin, id)
  if (!code) return NextResponse.json({ error: 'Could not generate referral code.' }, { status: 500 })

  const link = referralLink(code)

  try {
    await sendReferralLinkEmail(agent.email, agent.full_name, link)
  } catch (err) {
    console.error('[referral] email failed:', err)
    return NextResponse.json({ error: 'Could not send the email. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, link })
}
