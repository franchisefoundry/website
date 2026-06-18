import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueInvite } from '@/lib/supabase/issue-invite'
import { sendInviteEmail } from '@/lib/supabase/send-invite-email'
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
    user_metadata: { full_name: typedLead.full_name, role: 'franchisee' },
  })

  let authUserId = created?.user?.id

  if (createError && !createError.message.toLowerCase().includes('already')) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  if (!authUserId) {
    // listUsers() is paginated — look up by email in profiles table instead (no pagination issue)
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', typedLead.email)
      .single()
    authUserId = existingProfile?.id
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
      liquid_capital: typedLead.liquid_capital,
      preferred_locations: typedLead.preferred_locations,
      operator_model: typedLead.operator_model,
      experience: typedLead.experience,
      full_time_available: typedLead.full_time_available,
      multi_site_interest: typedLead.multi_site_interest,
      timeline_months: typedLead.timeline_months,
      sectors: typedLead.sectors,
      format_types: typedLead.format_types,
      goals: typedLead.goals,
      status: 'active',
      assigned_admin: user.id,
    }, { onConflict: 'user_id' })
    .select('id')
    .single()

  if (profileError || !franchiseeProfile) {
    return NextResponse.json({ error: 'Could not create franchisee profile.' }, { status: 500 })
  }

  // Transfer lead matches → franchisee matches
  const { data: leadMatches } = await admin.from('lead_matches').select('franchisor_id, score').eq('lead_id', id)

  if (leadMatches?.length) {
    const { error: matchErr } = await admin.from('matches').upsert(
      leadMatches.map(m => ({
        franchisee_id: franchiseeProfile.id,
        franchisor_id: m.franchisor_id,
        score: m.score,
        status: 'suggested',
      })),
      { onConflict: 'franchisee_id,franchisor_id', ignoreDuplicates: false }
    )
    if (matchErr) console.error('[convert] match transfer error:', matchErr)
  }

  // Mark lead converted
  const { error: leadUpdateErr } = await admin.from('leads').update({ status: 'converted' }).eq('id', id)
  if (leadUpdateErr) console.error('[convert] lead status update error:', leadUpdateErr)

  // Issue a 72h invite token and email it via Resend (unified account-creation path)
  const { token, error: inviteError } = await issueInvite(admin, {
    email: typedLead.email, role: 'franchisee', fullName: typedLead.full_name, invitedBy: user.id,
  })
  if (inviteError || !token) {
    console.error('[convert] issueInvite failed:', inviteError)
  } else {
    const emailErr = await sendInviteEmail(typedLead.email, typedLead.full_name, token)
    if (emailErr) console.error('[convert] sendInviteEmail failed:', emailErr)
  }

  // Bust Next.js page cache so leads list and franchisees list show fresh data immediately
  revalidatePath('/admin/leads')
  revalidatePath('/admin/franchisees')

  return NextResponse.json({ success: true, franchiseeId: franchiseeProfile.id })
}
