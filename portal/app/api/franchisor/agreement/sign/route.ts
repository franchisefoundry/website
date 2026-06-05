import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAgreementPdf } from '@/lib/pdf/generate-agreement'
import { notifyAdmins } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'franchisor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { signerName } = await req.json()
  if (!signerName?.trim()) return NextResponse.json({ error: 'Signer name required' }, { status: 400 })

  const admin = createAdminClient()

  // Get franchisor profile
  const { data: fp } = await admin
    .from('franchisor_profiles')
    .select('id, brand_name')
    .eq('user_id', user.id)
    .single()
  if (!fp) return NextResponse.json({ error: 'Franchisor profile not found' }, { status: 404 })

  // Get the franchisor agreement
  const { data: fa } = await admin
    .from('franchisor_agreements')
    .select('*, agreements(title, content, version)')
    .eq('franchisor_profile_id', fp.id)
    .single()

  if (!fa) return NextResponse.json({ error: 'No agreement found for this account' }, { status: 404 })
  if (fa.status === 'signed') return NextResponse.json({ error: 'Already signed' }, { status: 409 })
  if (fa.status !== 'sent') return NextResponse.json({ error: 'Agreement has not been sent for signing yet' }, { status: 400 })

  // Get real IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'

  const signedAt = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agreement = (fa as any).agreements

  // Generate PDF
  const pdfBytes = await generateAgreementPdf({
    signerName: signerName.trim(),
    signerEmail: profile.email ?? '',
    signerIp: ip,
    signedAt,
    agreementTitle: agreement.title,
    agreementVersion: agreement.version,
    agreementContent: agreement.content,
  })

  // Upload to Supabase Storage
  const fileName = `agreements/${fa.id}/${Date.now()}-signed.pdf`
  const { error: uploadError } = await admin.storage
    .from('documents')
    .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    console.error('PDF upload error:', uploadError)
    // Don't block signing if storage fails — still mark as signed
  }

  // Update franchisor_agreement
  const { error: updateError } = await admin
    .from('franchisor_agreements')
    .update({
      status: 'signed',
      signed_at: signedAt,
      signer_name: signerName.trim(),
      signer_ip: ip,
      signed_pdf_path: uploadError ? null : fileName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fa.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Notify admins
  const brandLabel = fp.brand_name || profile.full_name || profile.email || 'A franchisor'
  await notifyAdmins({
    type: 'agreement_signed',
    title: 'Agreement signed',
    body: `${brandLabel} has signed their franchise agreement.`,
    link: `/admin/agreements`,
  })

  return NextResponse.json({ success: true, signedPdfPath: uploadError ? null : fileName })
}
