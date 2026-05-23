import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendFranchisorMatchNotification } from '@/lib/email'
import type { FranchisorProfile, Lead } from '@/lib/supabase/types'

const OPERATOR_LABELS: Record<string, string> = {
  'owner-operator': 'Owner-operator',
  'hire-manager': 'Hire a manager',
  'either': 'Open to either',
}

export async function POST(request: NextRequest) {
  // Verify the caller is an admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { leadId, franchisorId } = await request.json()
  if (!leadId || !franchisorId) {
    return NextResponse.json({ error: 'leadId and franchisorId are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get the franchisor profile
  const { data: franchisor } = await admin
    .from('franchisor_profiles')
    .select('*')
    .eq('id', franchisorId)
    .single()

  if (!franchisor) {
    return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
  }

  const typedFranchisor = franchisor as FranchisorProfile

  if (!typedFranchisor.user_id) {
    return NextResponse.json({ error: 'Franchisor has no linked user account' }, { status: 404 })
  }

  // Get the franchisor's email from auth
  const { data: userData } = await admin.auth.admin.getUserById(typedFranchisor.user_id)
  const franchisorEmail = userData?.user?.email

  if (!franchisorEmail) {
    return NextResponse.json({ error: 'Could not find franchisor email address' }, { status: 404 })
  }

  // Get franchisor's name from profiles table
  const { data: franchisorProfileData } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', typedFranchisor.user_id)
    .single()

  const franchisorName = (franchisorProfileData?.full_name as string | null) ?? typedFranchisor.brand_name ?? 'there'

  // Get the specific lead + all matches this franchisor has for this lead
  const { data: lead } = await admin
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const typedLead = lead as Lead

  // Build match details for email (anonymised — just score + budget + timeline + model)
  const budget =
    typedLead.investment_min && typedLead.investment_max
      ? `£${(typedLead.investment_min / 1000).toFixed(0)}k – £${(typedLead.investment_max / 1000).toFixed(0)}k`
      : 'Not specified'

  const matchDetails = [
    {
      score: 0, // will be computed below
      budget,
      timeline: typedLead.timeline_months ? `${typedLead.timeline_months} months` : 'Flexible',
      operatorModel: typedLead.operator_model ? (OPERATOR_LABELS[typedLead.operator_model] ?? typedLead.operator_model) : '—',
    },
  ]

  // Get the actual match score from lead_matches
  const { data: matchRow } = await admin
    .from('lead_matches')
    .select('score')
    .eq('lead_id', leadId)
    .eq('franchisor_id', franchisorId)
    .single()

  if (matchRow) {
    matchDetails[0].score = matchRow.score
  }

  try {
    await sendFranchisorMatchNotification({
      franchisorEmail,
      franchisorName,
      brandName: typedFranchisor.brand_name ?? 'your brand',
      matches: matchDetails,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send notification email' }, { status: 500 })
  }
}
