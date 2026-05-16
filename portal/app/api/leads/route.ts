import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { scoreMatch } from '@/lib/matching'
import type { FranchiseeProfile, FranchisorProfile } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      full_name, email, phone,
      investment_min, investment_max,
      preferred_locations, operator_model, experience,
      full_time_available, multi_site_interest, timeline_months,
      sectors, goals,
      status = 'meeting_requested',
    } = body

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
    }
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Save the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        full_name,
        email,
        phone: phone || null,
        investment_min: investment_min || null,
        investment_max: investment_max || null,
        preferred_locations: preferred_locations ?? [],
        operator_model: operator_model || null,
        experience: experience || null,
        full_time_available: full_time_available ?? true,
        multi_site_interest: multi_site_interest ?? false,
        timeline_months: timeline_months || null,
        sectors: sectors?.length ? sectors : ['food-beverage'],
        goals: goals || null,
        status,
      })
      .select('id')
      .single()

    if (leadError || !lead) {
      console.error('Lead insert error:', leadError)
      return NextResponse.json(
        { error: `Could not save your details: ${leadError?.message ?? 'unknown error'}` },
        { status: 500 }
      )
    }

    // Load active franchisors and compute matches
    const { data: franchisors } = await supabase
      .from('franchisor_profiles')
      .select('*')
      .eq('status', 'active')

    if (franchisors?.length) {
      const pseudoFranchisee: FranchiseeProfile = {
        id: lead.id,
        user_id: lead.id,
        investment_min: investment_min ?? null,
        investment_max: investment_max ?? null,
        preferred_locations: preferred_locations ?? [],
        operator_model: operator_model ?? null,
        experience: experience ?? null,
        full_time_available: full_time_available ?? true,
        multi_site_interest: multi_site_interest ?? false,
        timeline_months: timeline_months ?? null,
        sectors: sectors ?? [],
        goals: goals ?? null,
        status: 'active',
        tier_2_unlocked: false,
        invited_at: null,
        activated_at: null,
        signed_at: null,
        assigned_admin: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const matchRows: { lead_id: string; franchisor_id: string; score: number }[] = []

      for (const franchisor of franchisors as FranchisorProfile[]) {
        const score = scoreMatch(pseudoFranchisee, franchisor)
        if (score > 0) {
          matchRows.push({ lead_id: lead.id, franchisor_id: franchisor.id, score })
        }
      }

      if (matchRows.length > 0) {
        await supabase.from('lead_matches').insert(matchRows)
      }
    }

    return NextResponse.json({ id: lead.id })

  } catch (err) {
    console.error('Leads API error:', err)
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
