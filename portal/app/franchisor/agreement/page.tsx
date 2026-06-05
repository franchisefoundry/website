import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import AgreementView from './AgreementView'

export default async function FranchisorAgreementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  const admin = createAdminClient()

  // Get the franchisor profile
  const { data: fp } = await admin
    .from('franchisor_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Get the franchisor's agreement
  const { data: fa } = fp
    ? await admin
        .from('franchisor_agreements')
        .select('id, status, sent_at, signed_at, signer_name, signed_pdf_path, agreement_id')
        .eq('franchisor_profile_id', fp.id)
        .single()
    : { data: null }

  // Get the current agreement template content
  const agreementId = fa?.agreement_id
  const { data: agreement } = agreementId
    ? await admin
        .from('agreements')
        .select('title, content, version')
        .eq('id', agreementId)
        .single()
    : await admin
        .from('agreements')
        .select('title, content, version')
        .eq('is_current', true)
        .single()

  // Get comments for this franchisor's agreement
  const { data: comments } = fa
    ? await admin
        .from('agreement_comments')
        .select('id, body, section_ref, resolved, created_at, author_id')
        .eq('franchisor_agreement_id', fa.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div>
      <PageHeader
        title="Your Agreement"
        description="Review and sign your Franchise Foundry franchise agreement."
      />
      <AgreementView
        franchisorAgreement={fa ?? null}
        agreementContent={agreement?.content ?? ''}
        agreementTitle={agreement?.title ?? 'Franchise Agreement'}
        agreementVersion={agreement?.version ?? 1}
        comments={comments ?? []}
        userFullName={profile?.full_name ?? null}
      />
    </div>
  )
}
