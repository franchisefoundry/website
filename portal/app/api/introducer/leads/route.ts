import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('introducer_leads')
    .select('*')
    .eq('introducer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('introducer_leads')
    .insert({
      introducer_id: user.id,
      status: 'submitted',
      first_name: body.first_name?.trim(),
      last_name:  body.last_name?.trim(),
      email:      body.email?.trim().toLowerCase(),
      phone:      body.phone || null,
      location:   body.location || null,
      investment_min:      body.investment_min ?? null,
      investment_max:      body.investment_max ?? null,
      liquid_capital:      body.liquid_capital ?? null,
      operator_model:      body.operator_model || null,
      experience:          body.experience || null,
      full_time_available: body.full_time_available ?? null,
      timeline_months:     body.timeline_months ?? null,
      sectors:             body.sectors?.length ? body.sectors : null,
      goals:               body.goals || null,
      source:              body.source || null,
      relationship:        body.relationship || null,
      introducer_notes:    body.introducer_notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
