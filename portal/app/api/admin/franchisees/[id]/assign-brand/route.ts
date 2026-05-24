import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendFranchisorMatchNotification } from '@/lib/email'

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

  // rank: 1 = primary, 2 = backup 1, 3 = backup 2
  const { franchisor_id, rank = 1 } = await request.json()
  if (!franchisor_id) return NextResponse.json({ error: 'franchisor_id required' }, { status: 400 })

  const admin = createAdminClient()

  // Build the profile update based on rank
  const profileUpdate: Record<string, unknown> = {}
  if (rank === 1) {
    profileUpdate.assigned_franchisor_id = franchisor_id
    profileUpdate.pipeline_stage = 'brand_shortlisted'
  } else if (rank === 2) {
    profileUpdate.backup_franchisor_1_id = franchisor_id
  } else if (rank === 3) {
    profileUpdate.backup_franchisor_2_id = franchisor_id
  }

  const { error: profileError } = await admin
    .from('franchisee_profiles')
    .update(profileUpdate)
    .eq('id', franchiseeId)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // Create a match record for this pairing
  const { error: matchError } = await admin
    .from('matches')
    .upsert(
      {
        franchisee_id: franchiseeId,
        franchisor_id,
        score: 0,
        status: 'suggested',
        pipeline_stage: rank === 1 ? 'match_assigned' : null,
        admin_notes: rank === 1 ? 'Primary assignment' : `Backup ${rank - 1} assignment`,
      },
      { onConflict: 'franchisee_id,franchisor_id', ignoreDuplicates: true }
    )

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 })

  // For primary assignments only: notify the franchisor by email
  if (rank === 1) {
    try {
      // Get franchisor profile + auth email
      const { data: franchisor } = await admin
        .from('franchisor_profiles')
        .select('user_id, brand_name')
        .eq('id', franchisor_id)
        .single()

      if (franchisor?.user_id) {
        const [{ data: userData }, { data: franchisorProfile }, { data: franchisee }] = await Promise.all([
          admin.auth.admin.getUserById(franchisor.user_id),
          admin.from('profiles').select('full_name').eq('id', franchisor.user_id).single(),
          admin.from('franchisee_profiles')
            .select('investment_min, investment_max, timeline_months, operator_model')
            .eq('id', franchiseeId)
            .single(),
        ])

        const email = userData?.user?.email
        if (email && franchisee) {
          const OPERATOR_LABELS: Record<string, string> = {
            'owner-operator': 'Owner-operator',
            'hire-manager': 'Hire a manager',
            'either': 'Open to either',
          }
          await sendFranchisorMatchNotification({
            franchisorEmail: email,
            franchisorName: franchisorProfile?.full_name ?? franchisor.brand_name ?? 'there',
            brandName: franchisor.brand_name ?? 'your brand',
            matches: [{
              score: 0,
              budget: franchisee.investment_min && franchisee.investment_max
                ? `£${Math.round(franchisee.investment_min / 1000)}k – £${Math.round(franchisee.investment_max / 1000)}k`
                : 'Not specified',
              timeline: franchisee.timeline_months ? `${franchisee.timeline_months} months` : 'Flexible',
              operatorModel: franchisee.operator_model
                ? (OPERATOR_LABELS[franchisee.operator_model] ?? franchisee.operator_model)
                : '—',
            }],
          })
        }
      }
    } catch (emailErr) {
      // Non-fatal — assignment succeeded, just log the email failure
      console.error('Match notification email failed:', emailErr)
    }
  }

  return NextResponse.json({ success: true })
}

// Remove a specific brand assignment (primary or backup)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: franchiseeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { rank = 1 } = await request.json()
  const admin = createAdminClient()

  const fieldMap: Record<number, string> = {
    1: 'assigned_franchisor_id',
    2: 'backup_franchisor_1_id',
    3: 'backup_franchisor_2_id',
  }
  const field = fieldMap[rank]
  if (!field) return NextResponse.json({ error: 'Invalid rank' }, { status: 400 })

  const { error } = await admin
    .from('franchisee_profiles')
    .update({ [field]: null })
    .eq('id', franchiseeId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
