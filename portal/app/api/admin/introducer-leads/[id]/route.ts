import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'

const NOTIFICATION_MESSAGES: Record<string, { title: string; body: (name: string) => string }> = {
  invited:    { title: 'Lead invited',      body: (n) => `${n} has been sent their platform invite.` },
  registered: { title: 'Lead registered',   body: (n) => `${n} has registered on the platform.` },
  matched:    { title: 'Lead matched',      body: (n) => `${n} has been matched with a franchise brand.` },
  intro_made: { title: 'Introduction made', body: (n) => `An introduction has been made for ${n}.` },
  signed:     { title: 'Lead signed! 🎉',   body: (n) => `${n} has signed a franchise agreement.` },
  paid:       { title: 'Commission due',    body: (n) => `Your commission for ${n} will be processed next month.` },
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status)           updates.status           = body.status
  if (body.rejection_reason !== undefined) updates.rejection_reason = body.rejection_reason

  const { error } = await admin
    .from('introducer_leads')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send notification (and optionally email) to the introducer
  if (body.status && NOTIFICATION_MESSAGES[body.status]) {
    const { data: lead } = await admin
      .from('introducer_leads')
      .select('introducer_id, first_name, last_name')
      .eq('id', id)
      .single()

    if (lead) {
      const leadName = `${lead.first_name} ${lead.last_name}`
      const msg = NOTIFICATION_MESSAGES[body.status]

      await admin.from('notifications').insert({
        user_id: lead.introducer_id,
        type: body.status,
        title: msg.title,
        body: msg.body(leadName),
        link: '/introducer/leads',
      })

      // Send email if lead signed
      if (body.status === 'signed') {
        const { data: introducerProfile } = await admin
          .from('profiles')
          .select('email, full_name')
          .eq('id', lead.introducer_id)
          .single()

        if (introducerProfile?.email) {
          const introducerName = introducerProfile.full_name ?? 'there'
          await sendEmail({
            to: introducerProfile.email,
            subject: `Great news — ${leadName} has signed! 🎉`,
            html: `
<h2>Great news — your lead has signed! 🎉</h2>
<p>Hi ${introducerName},</p>
<p><strong>${leadName}</strong> has signed a franchise agreement. Your commission will be calculated and processed next month.</p>
<p>Log in to your portal to track your commission status.</p>
<p>— The Franchise Foundry team</p>
`,
          })
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}
