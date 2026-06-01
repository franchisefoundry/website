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

    // Generate a magic link so admin can copy and share it manually
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: franchisor_email.trim().toLowerCase(),
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.franchisefoundry.co.uk'}/auth/callback?next=/setup-account`,
        data: { full_name: franchisor_name },
      },
    })

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }

    const franchiseeUserId = linkData?.user?.id
    if (!franchiseeUserId) {
      return NextResponse.json({ error: 'Could not find or create user.' }, { status: 500 })
    }

    await admin.from('profiles').upsert({
      id: franchiseeUserId,
      email: franchisor_email.trim().toLowerCase(),
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

    await admin.from('invites').insert({
      email: franchisor_email,
      role: 'franchisor',
      full_name: franchisor_name,
      invited_by: user.id,
    })

    return NextResponse.json({
      id: profile.id,
      success: true,
      invite_link: linkData?.properties?.action_link ?? null,
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
