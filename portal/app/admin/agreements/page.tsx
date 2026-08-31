import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { SettingsTabs } from '@/components/SettingsTabs'
import TemplateEditor from './TemplateEditor'
import AgreementsTable from './AgreementsTable'
import { AgreementIcon, QuestionnaireIcon } from '@/components/icons'

export default async function AdminAgreementsPage() {
  const admin = createAdminClient()

  // Fetch current template
  const { data: agreement } = await admin
    .from('agreements')
    .select('*')
    .eq('is_current', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

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

  const tabs = [
    {
      id: 'active', label: 'Active agreements', icon: <AgreementIcon className="w-4 h-4" />,
      content: (
        <div>
          <p className="text-sm text-ink-3 mb-4">Send a new agreement, track signatures, and open any brand&apos;s agreement to review or edit it.</p>
          <AgreementsTable
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            franchisorAgreements={(franchisorAgreements ?? []) as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            allFranchisors={(allFranchisors ?? []) as any}
            hasTemplate={!!agreement}
          />
        </div>
      ),
    },
    {
      id: 'template', label: 'Template', icon: <QuestionnaireIcon className="w-4 h-4" />,
      content: (
        <div>
          <p className="text-sm text-ink-3 mb-4">Upload a Word doc or edit the master agreement here. Every save creates a new version — brands always sign the version current at the time of sending.</p>
          <TemplateEditor initial={agreement ?? null} />
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Agreements" description="Send and track agreements, and manage the master template." />
      <SettingsTabs tabs={tabs} orientation="top" />
    </div>
  )
}
