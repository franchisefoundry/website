import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreMatch } from '@/lib/matching'
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

  let created = 0

  for (const franchisee of franchisees as FranchiseeProfile[]) {
    for (const franchisor of franchisors as FranchisorProfile[]) {
      const score = scoreMatch(franchisee, franchisor)
      if (score === 0) continue

      // Upsert — update score if match already exists
      const { error } = await supabase.from('matches').upsert(
        {
          franchisee_id: franchisee.id,
          franchisor_id: franchisor.id,
          score,
          status: 'suggested',
        },
        { onConflict: 'franchisee_id,franchisor_id', ignoreDuplicates: false }
      )

      if (!error) created++
    }
  }

  return NextResponse.json({ created })
}
