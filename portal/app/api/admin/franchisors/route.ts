import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueInvite, inviteUrl } from '@/lib/supabase/issue-invite'
import { sendInviteEmail } from '@/lib/supabase/send-invite-email'
import { findBrandByName, removeBlankDraftBrands, uniqueBrandSlug } from '@/lib/franchisor-brands'

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
      liquid_capital_min, franchise_fee, royalty_pct,
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

    if (!brand_name?.trim()) {
      return NextResponse.json({ error: 'Brand name is required.' }, { status: 400 })
    }
    const existing = await findBrandByName(admin, brand_name)
    if (existing) {
      return NextResponse.json(
        { error: `${existing.brand_name} already exists.`, existing_id: existing.id },
        { status: 409 },
      )
    }
    if (send_invite && (!franchisor_email?.trim() || !franchisor_name?.trim())) {
      return NextResponse.json({ error: 'Contact name and email are required to send an invite.' }, { status: 400 })
    }

    const num = (v: unknown) => (v === '' || v == null ? null : Number(v))
    const profileData = {
      brand_name: brand_name.trim(),
      slug: await uniqueBrandSlug(admin, brand_name),
      category: category || null,
      teaser: teaser || null,
      investment_min: num(investment_min),
      investment_max: num(investment_max),
      investment_display: investment_min && investment_max
        ? `£${Number(investment_min).toLocaleString('en-GB')} – £${Number(investment_max).toLocaleString('en-GB')}`
        : null,
      liquid_capital_min: num(liquid_capital_min),
      franchise_fee: num(franchise_fee),
      royalty_pct: num(royalty_pct),
      timeline_months: num(timeline_months),
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
      contact_email: franchisor_email?.trim().toLowerCase() || null,
      contact_name: franchisor_name?.trim() || null,
    }

    // Always create the brand first, unlinked. Linking a login is a second step,
    // so a failed invite never loses the profile the admin just typed in.
    const { data: brand, error: brandError } = await admin
      .from('franchisor_profiles')
      .insert({ ...profileData, user_id: null })
      .select('id')
      .single()
    if (brandError || !brand) {
      return NextResponse.json({ error: `Could not save brand: ${brandError?.message}` }, { status: 500 })
    }

    if (!send_invite) return NextResponse.json({ id: brand.id, success: true })

    // ── Invite: create/find the login, attach it to this brand, email the link ──
    const email = profileData.contact_email!
    const name = profileData.contact_name!
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name, role: 'franchisor' },
    })
    let userId = created?.user?.id
    if (createError && !createError.message.toLowerCase().includes('already')) {
      return NextResponse.json({ id: brand.id, error: `Brand saved, but the invite failed: ${createError.message}` }, { status: 500 })
    }
    if (!userId) {
      const { data: existingProfile } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle()
      userId = existingProfile?.id
    }
    if (!userId) {
      return NextResponse.json({ id: brand.id, error: 'Brand saved, but could not find or create the login.' }, { status: 500 })
    }

    await admin.from('profiles').upsert({ id: userId, email, full_name: name, role: 'franchisor' }, { onConflict: 'id' })
    await admin.from('franchisor_profiles').update({ user_id: userId }).eq('id', brand.id)
    await removeBlankDraftBrands(admin, userId, brand.id)

    const { token, error: inviteError } = await issueInvite(admin, {
      email, role: 'franchisor', fullName: name, invitedBy: user.id,
    })
    if (inviteError || !token) {
      return NextResponse.json({ id: brand.id, error: `Brand saved, but the invite failed: ${inviteError ?? 'no token'}` }, { status: 500 })
    }
    const emailError = await sendInviteEmail(email, name, token)

    return NextResponse.json({
      id: brand.id,
      success: true,
      invite_link: inviteUrl(token),
      email_sent: !emailError,
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
