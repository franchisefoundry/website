import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { Card, CardBody } from '@/components/ui/card'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

function QField({ label, value }: { label: string; value: string | string[] | boolean | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  let display: string
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    display = value.join(', ')
  } else if (typeof value === 'boolean') {
    display = value ? 'Yes' : 'No'
  } else {
    display = String(value)
  }
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{display}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      </div>
      <CardBody className="p-0">
        <div className="px-6">{children}</div>
      </CardBody>
    </Card>
  )
}

export default async function FranchisorQuestionnairePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()

  const [{ data: franchisor }, { data: questionnaire }] = await Promise.all([
    admin.from('franchisor_profiles').select('brand_name, category').eq('id', id).single(),
    admin.from('franchisor_questionnaires').select('*').eq('franchisor_id', id).single(),
  ])

  if (!franchisor) notFound()

  return (
    <div>
      <PageHeader
        title={`${franchisor.brand_name || 'Unnamed brand'} — Questionnaire`}
        description={franchisor.category || undefined}
        action={
          <Link
            href={`/admin/franchisors/${id}`}
            className="text-sm text-slate-500 border border-slate-300 hover:border-slate-400 px-4 py-2 rounded-lg transition-colors"
          >
            ← Brand profile
          </Link>
        }
      />

      {!questionnaire ? (
        <Card className="p-10 text-center">
          <p className="text-slate-400 text-sm">No questionnaire submitted yet for this brand.</p>
        </Card>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {questionnaire.completed_at && (
            <p className="text-xs text-slate-400">
              Submitted {new Date(questionnaire.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}

          <Section title="1 · The Business">
            <QField label="Core business model & day-to-day operations" value={questionnaire.core_model} />
            <QField label="Competitive advantage" value={questionnaire.competitive_advantage} />
            <QField label="Revenue streams" value={questionnaire.revenue_streams} />
            <QField label="High-performing unit (metrics)" value={questionnaire.high_performing_unit} />
            <QField label="Common reasons for underperformance" value={questionnaire.underperformance_reasons} />
          </Section>

          <Section title="2 · Financials">
            <QField label="Total investment range & breakdown" value={questionnaire.investment_range_raw} />
            <QField label="Commercial terms (fee, royalty, levy)" value={questionnaire.commercial_rates} />
            <QField label="Financial data shared with prospects" value={questionnaire.financial_metrics_shared} />
            <QField label="Break-even timeline" value={questionnaire.break_even_timeline} />
            <QField label="Most underestimated costs" value={questionnaire.underestimated_costs} />
            <QField label="Common financial objections" value={questionnaire.common_objections} />
          </Section>

          <Section title="3 · Ideal Franchisee">
            <QField label="Ideal franchisee profile" value={questionnaire.ideal_franchisee_profile} />
            <QField label="Required / preferred experience" value={questionnaire.background_experience} />
            <QField label="Top approval factors" value={questionnaire.approval_factors} />
            <QField label="Single-location licences granted" value={questionnaire.single_franchise_licenses} />
            <QField label="Operating model requirement" value={questionnaire.operating_model_raw} />
            <QField label="Common decline reasons" value={questionnaire.decline_reasons} />
            <QField label="Franchisee types that haven't worked" value={questionnaire.problematic_behaviours} />
            <QField label="Definition of franchisee success" value={questionnaire.success_definition} />
          </Section>

          <Section title="4 · Growth & Territory">
            <QField label="Annual growth targets" value={questionnaire.annual_growth_targets} />
            <QField label="Priority UK territories" value={questionnaire.priority_territories} />
            <QField label="Growth speed vs. quality balance" value={questionnaire.growth_speed_vs_quality} />
            <QField label="Biggest scaling concern" value={questionnaire.scaling_concerns} />
          </Section>

          <Section title="5 · Recruitment Process">
            <QField label="Where enquiries come from" value={questionnaire.inquiry_channels} />
            <QField label="Screening process" value={questionnaire.screening_method} />
            <QField label="When approval decision is made" value={questionnaire.approval_timing} />
            <QField label="Final sign-off authority" value={questionnaire.approval_authority} />
            <QField label="Timeline: enquiry to contract" value={questionnaire.timeline_inquiry_to_contract} />
            <QField label="Post-signing onboarding activities" value={questionnaire.post_signing_activities} />
            <QField label="Timeline: signing to opening" value={questionnaire.timeline_signing_to_launch} />
            <QField label="Biggest recruitment bottlenecks" value={questionnaire.process_bottlenecks} />
            <QField label="Recruitment process self-rating (1–10)" value={questionnaire.recruitment_process_rating} />
          </Section>
        </div>
      )}
    </div>
  )
}
