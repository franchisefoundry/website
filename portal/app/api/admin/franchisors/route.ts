import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // Verify admin
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

    const body = await request.json()
    const {
      // Franchisor contact
      franchisor_name, franchisor_email,
      // Brand profile fields
      brand_name, category, teaser,
      investment_min, investment_max, timeline_months,
      highlights, operator_model, experience_required,
      format, full_time_required, multi_site_ready,
      locations_available, locations_display,
      sectors,
      // Status
      status = 'active',
    } = body

    if (!franchisor_email || !franchisor_name) {
      return NextResponse.json({ error: 'Franchisor name and email are required.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Invite the franchisor user
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      franchisor_email,
      {
        data: { full_name: franchisor_name },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      }
    )

    // Allow "already registered" — we'll still create/update the profile
    if (inviteError && !inviteError.message.toLowerCase().includes('already')) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    // Get the user ID (either from invite or existing user lookup)
    let franchiseeUserId = inviteData?.user?.id
    if (!franchiseeUserId) {
      const { data: { users } } = await admin.auth.admin.listUsers()
      const existing = users.find(u => u.email === franchisor_email)
      franchiseeUserId = existing?.id
    }

    if (!franchiseeUserId) {
      return NextResponse.json({ error: 'Could not find or create user.' }, { status: 500 })
    }

    // Ensure profile record exists with franchisor role
    await admin.from('profiles').upsert({
      id: franchiseeUserId,
      email: franchisor_email,
      full_name: franchisor_name,
      role: 'franchisor',
    }, { onConflict: 'id' })

    const slug = slugify(brand_name || franchisor_name)

    // Create/update the brand profile
    const { data: profile, error: profileError } = await admin
      .from('franchisor_profiles')
      .upsert({
        user_id: franchiseeUserId,
        brand_name: brand_name || null,
        slug,
        category: category || null,
        teaser: teaser || null,
        investment_min: investment_min || null,
        investment_max: investment_max || null,
        investment_display: investment_min && investment_max
          ? `£${Number(investment_min).toLocaleString('en-GB')} – £${Number(investment_max).toLocaleString('en-GB')}`
          : null,
        timeline_months: timeline_months || null,
        highlights: highlights?.filter(Boolean) ?? [],
        operator_model: operator_model || null,
        experience_required: experience_required || null,
        format: format ?? [],
        full_time_required: full_time_required ?? true,
        multi_site_ready: multi_site_ready ?? false,
        locations_available: locations_available ?? [],
        locations_display: locations_display || null,
        sectors: sectors ?? [],
        status,
      }, { onConflict: 'user_id' })
      .select('id')
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: `Could not create brand profile: ${profileError?.message}` },
        { status: 500 }
      )
    }

    // Log the invite
    await admin.from('invites').insert({
      email: franchisor_email,
      role: 'franchisor',
      full_name: franchisor_name,
      invited_by: user.id,
    })

    return NextResponse.json({ id: profile.id, success: true })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
