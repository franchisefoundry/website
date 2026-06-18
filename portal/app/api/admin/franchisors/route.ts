import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueInvite, inviteUrl } from '@/lib/supabase/issue-invite'
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
      // Whether to send the invite email immediately
      send_invite = false,
    } = body

    const admin = createAdminClient()
    const slug = slugify(brand_name || franchisor_name || 'brand')

    const profileData = {
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
      contact_email: franchisor_email || null,
      contact_name: franchisor_name || null,
    }

    if (!send_invite) {
      // Save profile only — no invite sent
      const { data: profile, error: profileError } = await admin
        .from('franchisor_profiles')
        .insert({ ...profileData, user_id: null })
        .select('id')
        .single()

      if (profileError || !profile) {
        return NextResponse.json(
          { error: `Could not save profile: ${profileError?.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({ id: profile.id, success: true })
    }

    // Send invite flow
    if (!franchisor_email || !franchisor_name) {
      return NextResponse.json({ error: 'Name and email are required to send an invite.' }, { status: 400 })
    }

    // Create the auth user (email_confirm skips Supabase's own email; we issue our own link)
    const normalisedEmail = franchisor_email.trim().toLowerCase()
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: normalisedEmail,
      email_confirm: true,
      user_metadata: { full_name: franchisor_name, role: 'franchisor' },
    })

    let franchiseeUserId = created?.user?.id

    if (createError && !createError.message.toLowerCase().includes('already')) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    if (!franchiseeUserId) {
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('id')
        .eq('email', normalisedEmail)
        .single()
      franchiseeUserId = existingProfile?.id
    }

    if (!franchiseeUserId) {
      return NextResponse.json({ error: 'Could not find or create user.' }, { status: 500 })
    }

    await admin.from('profiles').upsert({
      id: franchiseeUserId,
      email: normalisedEmail,
      full_name: franchisor_name,
      role: 'franchisor',
    }, { onConflict: 'id' })

    const { data: profile, error: profileError } = await admin
      .from('franchisor_profiles')
      .upsert({ ...profileData, user_id: franchiseeUserId }, { onConflict: 'user_id' })
      .select('id')
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: `Could not create brand profile: ${profileError?.message}` },
        { status: 500 }
      )
    }

    // Issue a 72h invite token — return the working /auth/invite link for the admin to share
    const { token, error: inviteError } = await issueInvite(admin, {
      email: normalisedEmail, role: 'franchisor', fullName: franchisor_name, invitedBy: user.id,
    })
    if (inviteError || !token) {
      return NextResponse.json({ error: inviteError ?? 'Could not create invite.' }, { status: 500 })
    }

    return NextResponse.json({
      id: profile.id,
      success: true,
      invite_link: inviteUrl(token),
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
