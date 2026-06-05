import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import TemplateEditor from './TemplateEditor'
import AgreementsTable from './AgreementsTable'

export default async function AdminAgreementsPage() {
  const admin = createAdminClient()

  // Fetch current template
  const { data: agreement } = await admin
    .from('agreements')
    .select('*')
    .eq('is_current', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  // Fetch all franchisor agreements with profile info
  const { data: franchisorAgreements } = await admin
    .from('franchisor_agreements')
    .select(`
      id, status, sent_at, signed_at, signer_name, signed_pdf_path,
      franchisor_profiles!inner(id, brand_name, user_id, profiles(full_name, email))
    `)
    .order('sent_at', { ascending: false })

  // Fetch all franchisors (so admin can send to ones not yet in the table)
  const { data: allFranchisors } = await admin
    .from('franchisor_profiles')
    .select('id, brand_name, user_id, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-10">
      <PageHeader
        title="Agreements"
        description="Manage the master franchise agreement template and track signatures."
      />

      {/* Status table */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Franchisor signatures</h2>
        <AgreementsTable
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          franchisorAgreements={(franchisorAgreements ?? []) as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          allFranchisors={(allFranchisors ?? []) as any}
          hasTemplate={!!agreement}
        />
      </section>

      {/* Template editor */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Agreement template</h2>
        <p className="text-sm text-slate-500 mb-4">
          Edit the master agreement below. Every save creates a new version — franchisors always sign the version current at the time of sending.
        </p>
        <TemplateEditor initial={agreement ?? null} />
      </section>
    </div>
  )
}
