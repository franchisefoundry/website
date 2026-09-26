import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreMatchDetailed } from '@/lib/matching'
import type { FranchiseeProfile, FranchisorProfile } from '@/lib/supabase/types'

export async function POST() {
  const supabase = await createClient()

  // Verify admin
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

  // Load active franchisees and franchisors
  const [{ data: franchisees }, { data: franchisors }] = await Promise.all([
    supabase.from('franchisee_profiles').select('*').eq('status', 'active'),
    supabase.from('franchisor_profiles').select('*').eq('status', 'active'),
  ])

  if (!franchisees?.length || !franchisors?.length) {
    return NextResponse.json({ created: 0 })
  }

  // Load tunable weights (falls back to the defaults inside the scorer).
  const { data: w } = await supabase.from('match_weights').select('*').eq('id', 1).single()
  const weights = w
    ? { experience: w.experience, budget: w.budget, operator: w.operator, timeline: w.timeline, format: w.format, location: w.location, full_time: w.full_time, multi_site: w.multi_site }
    : undefined

  let created = 0

  for (const franchisee of franchisees as FranchiseeProfile[]) {
    for (const franchisor of franchisors as FranchisorProfile[]) {
      const { score, reasons } = scoreMatchDetailed(franchisee, franchisor, weights)
      if (score === 0) continue

      // Upsert — update score + reasons if the match already exists
      const { error } = await supabase.from('matches').upsert(
        {
          franchisee_id: franchisee.id,
          franchisor_id: franchisor.id,
          score,
          match_reasons: reasons,
          status: 'suggested',
        },
        { onConflict: 'franchisee_id,franchisor_id', ignoreDuplicates: false }
      )

      if (!error) created++
    }
  }

  return NextResponse.json({ created })
}
