import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify, notifyAdmins } from '@/lib/notifications'

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

  // A signed agreement is executed and cannot be re-issued. A 'sent' one CAN be
  // re-issued (e.g. after revising the template in response to the brand's
  // comments) — this updates it to the current template version and re-notifies.
  const { data: existing } = await admin
    .from('franchisor_agreements')
    .select('id, status')
    .eq('franchisor_profile_id', franchisorProfileId)
    .maybeSingle()

  if (existing?.status === 'signed') {
    return NextResponse.json({ error: 'This agreement is already signed and cannot be re-issued.' }, { status: 409 })
  }
  const reissue = existing?.status === 'sent'

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

  // Notify the franchisor (in-app always; email per their preference)
  if (fp?.user_id) {
    await notify({
      userId: fp.user_id,
      event: 'agreement_ready',
      title: reissue ? 'Your agreement has been updated' : 'Your agreement is ready to sign',
      body: reissue
        ? 'An updated version of your Franchise Foundry agreement is ready to review and sign.'
        : 'Your Franchise Foundry agreement is ready. Please review and sign it in the portal.',
      link: '/franchisor/agreement',
    })
  }

  // Notify admins
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brandLabel = (fp as any)?.brand_name || (fp as any)?.profiles?.full_name || 'A franchisor'
  await notifyAdmins({
    type: 'agreement_sent',
    title: reissue ? 'Agreement re-issued' : 'Agreement sent',
    body: `Agreement ${reissue ? 're-issued' : 'sent'} to ${brandLabel} for signature.`,
    link: `/admin/agreements`,
  })

  return NextResponse.json({ success: true, franchisorAgreement: fa })
}
