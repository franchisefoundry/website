import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: franchisorId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { updates } = await request.json()
  if (!updates) return NextResponse.json({ error: 'updates required' }, { status: 400 })

  const admin = createAdminClient()

  // Upsert — admin can save even if no questionnaire exists yet
  const { error } = await admin
    .from('franchisor_questionnaires')
    .upsert({ franchisor_id: franchisorId, ...updates }, { onConflict: 'franchisor_id' })

  if (error) {
    console.error('Admin questionnaire patch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sync matching-critical fields to franchisor_profiles
  const profileSyncs: Record<string, unknown> = {}
  if (updates.investment_min !== undefined)          profileSyncs.investment_min = updates.investment_min
  if (updates.investment_max !== undefined)          profileSyncs.investment_max = updates.investment_max
  if (updates.operating_model_raw !== undefined)     profileSyncs.operator_model = updates.operating_model_raw
  if (updates.single_franchise_licenses !== undefined) profileSyncs.multi_site_ready = !updates.single_franchise_licenses
  if (updates.liquid_capital_min !== undefined)      profileSyncs.liquid_capital_min = updates.liquid_capital_min
  if (updates.experience_required !== undefined)     profileSyncs.experience_required = updates.experience_required
  if (updates.full_time_required !== undefined)      profileSyncs.full_time_required = updates.full_time_required
  if (updates.timeline_months !== undefined)         profileSyncs.timeline_months = updates.timeline_months
  if (updates.format_types !== undefined)            profileSyncs.format = updates.format_types
  if (updates.locations_available !== undefined)     profileSyncs.locations_available = updates.locations_available

  if (Object.keys(profileSyncs).length > 0) {
    await admin.from('franchisor_profiles').update(profileSyncs).eq('id', franchisorId)
  }

  return NextResponse.json({ success: true })
}
