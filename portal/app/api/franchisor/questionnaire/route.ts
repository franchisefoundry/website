import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { franchisorId, updates } = await request.json()
    if (!franchisorId || !updates) {
      return NextResponse.json({ error: 'franchisorId and updates are required' }, { status: 400 })
    }

    // Verify the franchisor profile belongs to this user
    const { data: profile } = await supabase
      .from('franchisor_profiles')
      .select('id')
      .eq('id', franchisorId)
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('franchisor_questionnaires')
      .update(updates)
      .eq('franchisor_id', franchisorId)

    if (error) {
      console.error('Questionnaire update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sync matching-critical fields to franchisor_profiles
    const profileSyncs: Record<string, unknown> = {}
    if (updates.investment_min !== undefined)            profileSyncs.investment_min = updates.investment_min
    if (updates.investment_max !== undefined)            profileSyncs.investment_max = updates.investment_max
    if (updates.operating_model_raw !== undefined)       profileSyncs.operator_model = updates.operating_model_raw
    if (updates.single_franchise_licenses !== undefined) profileSyncs.multi_site_ready = !updates.single_franchise_licenses
    if (updates.liquid_capital_min !== undefined)        profileSyncs.liquid_capital_min = updates.liquid_capital_min
    if (updates.experience_required !== undefined)       profileSyncs.experience_required = updates.experience_required
    if (updates.full_time_required !== undefined)        profileSyncs.full_time_required = updates.full_time_required
    if (updates.timeline_months !== undefined)           profileSyncs.timeline_months = updates.timeline_months
    if (updates.format_types !== undefined)              profileSyncs.format = updates.format_types
    if (updates.locations_available !== undefined)       profileSyncs.locations_available = updates.locations_available

    if (Object.keys(profileSyncs).length > 0) {
      await admin.from('franchisor_profiles').update(profileSyncs).eq('id', franchisorId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Questionnaire PATCH error:', err)
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
