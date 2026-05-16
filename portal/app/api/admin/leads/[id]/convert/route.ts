import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMagicLink } from '@/lib/supabase/send-magic-link'
import type { Lead } from '@/lib/supabase/types'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'admin') return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })

  const admin = createAdminClient()

  const { data: lead, error: leadError } = await admin.from('leads').select('*').eq('id', id).single()
  if (leadError || !lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })

  const typedLead = lead as Lead
  // createUser with email_confirm:true — no Supabase email sent, no PKCE complications.
  // We always send our own magic link so every link uses token_hash.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: typedLead.email,
    email_confirm: true,
    user_metadata: { full_name: typedLead.full_name },
  })

  let authUserId = created?.user?.id

  if (createError && !createError.message.toLowerCase().includes('already')) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  if (!authUserId) {
    const { data: { users } } = await admin.auth.admin.listUsers()
    authUserId = users.find(u => u.email === typedLead.email)?.id
  }

  if (!authUserId) return NextResponse.json({ error: 'Could not find or create user.' }, { status: 500 })

  await admin.from('profiles').upsert({
    id: authUserId,
    email: typedLead.email,
    full_name: typedLead.full_name,
    phone: typedLead.phone,
    role: 'franchisee',
  }, { onConflict: 'id' })

  const { data: franchiseeProfile, error: profileError } = await admin
    .from('franchisee_profiles')
    .upsert({
      user_id: authUserId,
      investment_min: typedLead.investment_min,
      investment_max: typedLead.investment_max,
      preferred_locations: typedLead.preferred_locations,
      operator_model: typedLead.operator_model,
      experience: typedLead.experience,
      full_time_available: typedLead.full_time_available,
      multi_site_interest: typedLead.multi_site_interest,
      timeline_months: typedLead.timeline_months,
      sectors: typedLead.sectors,
      goals: typedLead.goals,
      status: 'active',
      assigned_admin: user.id,
    }, { onConflict: 'user_id' })
    .select('id')
    .single()

  if (profileError || !franchiseeProfile) {
    return NextResponse.json({ error: 'Could not create franchisee profile.' }, { status: 500 })
  }

  const { data: leadMatches } = await admin.from('lead_matches').select('franchisor_id, score').eq('lead_id', id)

  if (leadMatches?.length) {
    await admin.from('matches').upsert(
      leadMatches.map(m => ({
        franchisee_id: franchiseeProfile.id,
        franchisor_id: m.franchisor_id,
        score: m.score,
        status: 'suggested',
      })),
      { onConflict: 'franchisee_id,franchisor_id', ignoreDuplicates: false }
    )
  }

  await admin.from('leads').update({ status: 'converted' }).eq('id', id)
  await admin.from('invites').insert({ email: typedLead.email, role: 'franchisee', full_name: typedLead.full_name, invited_by: user.id })

  const linkErr = await sendMagicLink(typedLead.email, typedLead.full_name, null)
  if (linkErr) console.error('[convert] sendMagicLink failed:', linkErr)

  return NextResponse.json({ success: true })
}
