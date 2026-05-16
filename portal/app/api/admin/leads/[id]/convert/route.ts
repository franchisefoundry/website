import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Lead } from '@/lib/supabase/types'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Verify caller is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Load lead
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
  }

  const typedLead = lead as Lead

  // Send portal invite via Supabase Auth
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(typedLead.email, {
    data: { full_name: typedLead.full_name },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
  })

  if (inviteError && !inviteError.message.includes('already been registered')) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Get or create auth user
  const { data: { users } } = await admin.auth.admin.listUsers()
  const authUser = users.find(u => u.email === typedLead.email)

  if (!authUser) {
    return NextResponse.json({ error: 'Could not find user after invite.' }, { status: 500 })
  }

  // Ensure profile exists with franchisee role
  await admin.from('profiles').upsert({
    id: authUser.id,
    email: typedLead.email,
    full_name: typedLead.full_name,
    phone: typedLead.phone,
    role: 'franchisee',
  }, { onConflict: 'id' })

  // Create franchisee profile pre-populated from lead data
  const { data: franchiseeProfile, error: profileError } = await admin
    .from('franchisee_profiles')
    .upsert({
      user_id: authUser.id,
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

  // Copy lead matches into real matches table (as 'suggested')
  const { data: leadMatches } = await admin
    .from('lead_matches')
    .select('franchisor_id, score')
    .eq('lead_id', id)

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

  // Mark lead as converted
  await admin.from('leads').update({ status: 'converted' }).eq('id', id)

  // Log invite
  await admin.from('invites').insert({
    email: typedLead.email,
    role: 'franchisee',
    full_name: typedLead.full_name,
    invited_by: user.id,
  })

  return NextResponse.json({ success: true })
}
