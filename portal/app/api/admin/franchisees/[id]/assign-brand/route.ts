import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: franchiseeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { franchisor_id } = await request.json()
  if (!franchisor_id) return NextResponse.json({ error: 'franchisor_id required' }, { status: 400 })

  const admin = createAdminClient()

  // Set assigned_franchisor_id on franchisee profile and advance pipeline stage
  const { error: profileError } = await admin
    .from('franchisee_profiles')
    .update({
      assigned_franchisor_id: franchisor_id,
      pipeline_stage: 'brand_shortlisted',
    })
    .eq('id', franchiseeId)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // Upsert a match record so the franchisor sees this franchisee
  const { error: matchError } = await admin
    .from('matches')
    .upsert(
      {
        franchisee_id: franchiseeId,
        franchisor_id,
        score: 0,
        status: 'suggested',
        admin_notes: 'Admin assigned',
      },
      { onConflict: 'franchisee_id,franchisor_id', ignoreDuplicates: true }
    )

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
