import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { SettingsTabs } from '@/components/SettingsTabs'
import TemplateEditor from './TemplateEditor'
import { SendWorkflow, type SendableBrand } from '@/components/admin/agreements/SendWorkflow'
import { AgreementsList, type AgreementRow } from '@/components/admin/agreements/AgreementsList'
import { SendIcon, AgreementIcon, QuestionnaireIcon, ArchiveIcon } from '@/components/icons'

export default async function AdminAgreementsPage() {
  const admin = createAdminClient()

  const { data: agreement } = await admin
    .from('agreements').select('*').eq('is_current', true).order('version', { ascending: false }).limit(1).maybeSingle()

  const { data: franchisorAgreements } = await admin
    .from('franchisor_agreements')
    .select('id, status, sent_at, signed_at, signer_name, signed_pdf_path, franchisor_profiles!inner(id, brand_name, profiles(full_name, email))')
    .order('sent_at', { ascending: false })

  const { data: allFranchisors } = await admin
    .from('franchisor_profiles').select('id, brand_name, profiles(full_name, email)').order('created_at', { ascending: false })

  // Open (unresolved) comment counts per agreement — drives the "Needs your reply" group.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agIds = (franchisorAgreements ?? []).map((a: any) => a.id)
  const { data: openComments } = agIds.length
    ? await admin.from('agreement_comments').select('franchisor_agreement_id').eq('resolved', false).in('franchisor_agreement_id', agIds)
    : { data: [] }
  const openCount: Record<string, number> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(openComments ?? []).forEach((c: any) => { openCount[c.franchisor_agreement_id] = (openCount[c.franchisor_agreement_id] ?? 0) + 1 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: AgreementRow[] = (franchisorAgreements ?? []).map((a: any) => ({
    id: a.id,
    brandId: a.franchisor_profiles.id,
    brandName: a.franchisor_profiles.brand_name || a.franchisor_profiles.profiles?.full_name || 'Unnamed',
    email: a.franchisor_profiles.profiles?.email ?? null,
    status: a.status,
    sent_at: a.sent_at,
    signed_at: a.signed_at,
    signer_name: a.signer_name,
    signed_pdf_path: a.signed_pdf_path,
    openComments: openCount[a.id] ?? 0,
  }))

  const sentIds = new Set(rows.map(r => r.brandId))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brands: SendableBrand[] = (allFranchisors ?? []).map((b: any) => ({
    id: b.id,
    name: b.brand_name || b.profiles?.full_name || 'Unnamed',
    email: b.profiles?.email ?? null,
    hasAgreement: sentIds.has(b.id),
  }))

  const helper = (t: string) => <p className="text-sm text-ink-3 mb-4">{t}</p>

  const tabs = [
    { id: 'send', label: 'Send', icon: <SendIcon className="w-4 h-4" />, content: (
      <div>{helper('Send an agreement to a brand in three quick steps. They’ll be notified to review, comment and e-sign.')}<SendWorkflow brands={brands} templateTitle={agreement?.title ?? 'Franchise Agreement'} templateVersion={agreement?.version ?? 1} hasTemplate={!!agreement} /></div>
    ) },
    { id: 'active', label: 'Active', icon: <AgreementIcon className="w-4 h-4" />, content: (
      <div>{helper('Agreements out for signature. Ones with open brand comments are grouped first so you know what needs your reply.')}<AgreementsList agreements={rows} mode="active" /></div>
    ) },
    { id: 'templates', label: 'Templates', icon: <QuestionnaireIcon className="w-4 h-4" />, content: (
      <div>{helper('Upload a Word doc or edit the master agreement. Every save creates a new version — brands sign the version current at send time.')}<TemplateEditor initial={agreement ?? null} /></div>
    ) },
    { id: 'archive', label: 'Archive', icon: <ArchiveIcon className="w-4 h-4" />, content: (
      <div>{helper('Signed and executed agreements — your legal record, downloadable as PDF.')}<AgreementsList agreements={rows} mode="archive" /></div>
    ) },
  ]

  return (
    <div>
      <PageHeader title="Agreements" description="Send and track franchise agreements, manage templates, and store signed copies." />
      <SettingsTabs tabs={tabs} orientation="top" />
    </div>
  )
}
