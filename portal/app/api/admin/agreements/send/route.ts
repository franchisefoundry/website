import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmins } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { franchisorProfileId } = await req.json()
  if (!franchisorProfileId) return NextResponse.json({ error: 'franchisorProfileId required' }, { status: 400 })

  const admin = createAdminClient()

  // Get current agreement template
  const { data: agreement, error: agreementError } = await admin
    .from('agreements')
    .select('id, title, version')
    .eq('is_current', true)
    .single()

  if (agreementError || !agreement) {
    return NextResponse.json({ error: 'No agreement template found. Please create one first.' }, { status: 404 })
  }

  // Check not already sent
  const { data: existing } = await admin
    .from('franchisor_agreements')
    .select('id, status')
    .eq('franchisor_profile_id', franchisorProfileId)
    .in('status', ['sent', 'signed'])
    .limit(1)
    .single()

  if (existing) {
    return NextResponse.json({
      error: `Agreement already ${existing.status} for this franchisor.`
    }, { status: 409 })
  }

  // Get franchisor user_id for notification
  const { data: fp } = await admin
    .from('franchisor_profiles')
    .select('user_id, brand_name, profiles(email, full_name)')
    .eq('id', franchisorProfileId)
    .single()

  // Create or update the franchisor_agreement record
  const { data: fa, error: faError } = await admin
    .from('franchisor_agreements')
    .upsert({
      franchisor_profile_id: franchisorProfileId,
      agreement_id: agreement.id,
      status: 'sent',
      sent_at: new Date().toISOString(),
    }, { onConflict: 'franchisor_profile_id' })
    .select()
    .single()

  if (faError) return NextResponse.json({ error: faError.message }, { status: 500 })

  // Notify the franchisor (in-app)
  if (fp?.user_id) {
    await admin.from('notifications').insert({
      user_id: fp.user_id,
      type: 'agreement_ready',
      title: 'Your agreement is ready to sign',
      body: 'Your Franchise Foundry agreement is ready. Please review and sign it in the portal.',
      link: '/franchisor/agreement',
    })
  }

  // Notify admins
  const brandLabel = (fp as any)?.brand_name || (fp as any)?.profiles?.full_name || 'A franchisor'
  await notifyAdmins({
    type: 'agreement_sent',
    title: 'Agreement sent',
    body: `Agreement sent to ${brandLabel} for signature.`,
    link: `/admin/agreements`,
  })

  return NextResponse.json({ success: true, franchisorAgreement: fa })
}
