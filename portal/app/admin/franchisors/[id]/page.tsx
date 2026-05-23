import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import { formatInvestmentRange } from '@/lib/utils'
import FranchisorStatusActions from './actions'
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

export default async function FranchisorDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: franchisor } = await supabase
    .from('franchisor_profiles')
    .select('*, profiles(full_name, email)')
    .eq('id', id)
    .single()

  if (!franchisor) notFound()

  const admin = createAdminClient()
  const { data: questionnaire } = await admin
    .from('franchisor_questionnaires')
    .select('*')
    .eq('franchisor_id', id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = franchisor.profiles as any

  return (
    <div>
      <PageHeader
        title={franchisor.brand_name || 'Incomplete profile'}
        description={profile?.email}
        action={
          <Link
            href={`/admin/franchisors/${id}/edit`}
            className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Edit profile
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Brand profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Brand profile</CardTitle>
                {statusBadge(franchisor.status)}
              </div>
            </CardHeader>
            <CardBody>
              {franchisor.teaser && (
                <p className="text-sm text-slate-600 mb-6 italic">&ldquo;{franchisor.teaser}&rdquo;</p>
              )}
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="text-slate-500 mb-0.5">Category</dt>
                  <dd className="font-medium">{franchisor.category || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Investment range</dt>
                  <dd className="font-medium">{formatInvestmentRange(franchisor.investment_min, franchisor.investment_max)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Locations</dt>
                  <dd className="font-medium">{franchisor.locations_display || franchisor.locations_available?.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Timeline</dt>
                  <dd className="font-medium">{franchisor.timeline_months ? `${franchisor.timeline_months} months` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Operator model</dt>
                  <dd className="font-medium capitalize">{franchisor.operator_model?.replace('-', ' ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Experience required</dt>
                  <dd className="font-medium capitalize">{franchisor.experience_required?.replace('-', ' ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Full-time required</dt>
                  <dd className="font-medium">{franchisor.full_time_required ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Multi-site ready</dt>
                  <dd className="font-medium">{franchisor.multi_site_ready ? 'Yes' : 'No'}</dd>
                </div>
              </dl>

              {franchisor.highlights?.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-slate-700 mb-2">Highlights</p>
                  <ul className="space-y-1">
                    {franchisor.highlights.map((h: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 flex gap-2">
                        <span className="text-brand-gold mt-0.5">•</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Onboarding questionnaire */}
          {questionnaire ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Onboarding questionnaire</CardTitle>
                  {questionnaire.completed_at && (
                    <span className="text-xs text-slate-400">
                      Completed {new Date(questionnaire.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {/* Section 1 */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">The Business</p>
                </div>
                <div className="px-6">
                  <QField label="Core business model & day-to-day operations" value={questionnaire.core_model} />
                  <QField label="Competitive advantage" value={questionnaire.competitive_advantage} />
                  <QField label="Revenue streams" value={questionnaire.revenue_streams} />
                  <QField label="High-performing unit (metrics)" value={questionnaire.high_performing_unit} />
                  <QField label="Common reasons for underperformance" value={questionnaire.underperformance_reasons} />
                </div>

                {/* Section 2 */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 border-t mt-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financials</p>
                </div>
                <div className="px-6">
                  <QField label="Total investment range & breakdown" value={questionnaire.investment_range_raw} />
                  <QField label="Commercial terms (fee, royalty, levy)" value={questionnaire.commercial_rates} />
                  <QField label="Financial data shared with prospects" value={questionnaire.financial_metrics_shared} />
                  <QField label="Break-even timeline" value={questionnaire.break_even_timeline} />
                  <QField label="Most underestimated costs" value={questionnaire.underestimated_costs} />
                  <QField label="Common financial objections" value={questionnaire.common_objections} />
                </div>

                {/* Section 3 */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 border-t mt-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ideal Franchisee</p>
                </div>
                <div className="px-6">
                  <QField label="Ideal franchisee profile" value={questionnaire.ideal_franchisee_profile} />
                  <QField label="Required / preferred experience" value={questionnaire.background_experience} />
                  <QField label="Top approval factors" value={questionnaire.approval_factors} />
                  <QField label="Single-location licences granted" value={questionnaire.single_franchise_licenses} />
                  <QField label="Operating model requirement" value={questionnaire.operating_model_raw} />
                  <QField label="Common decline reasons" value={questionnaire.decline_reasons} />
                  <QField label="Franchisee types that haven't worked" value={questionnaire.problematic_behaviours} />
                  <QField label="Definition of franchisee success" value={questionnaire.success_definition} />
                </div>

                {/* Section 4 */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 border-t mt-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Growth & Territory</p>
                </div>
                <div className="px-6">
                  <QField label="Annual growth targets" value={questionnaire.annual_growth_targets} />
                  <QField label="Priority UK territories" value={questionnaire.priority_territories} />
                  <QField label="Growth speed vs. quality balance" value={questionnaire.growth_speed_vs_quality} />
                  <QField label="Biggest scaling concern" value={questionnaire.scaling_concerns} />
                </div>

                {/* Section 5 */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 border-t mt-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recruitment Process</p>
                </div>
                <div className="px-6 pb-2">
                  <QField label="Where enquiries come from" value={questionnaire.inquiry_channels} />
                  <QField label="Screening process" value={questionnaire.screening_method} />
                  <QField label="When approval decision is made" value={questionnaire.approval_timing} />
                  <QField label="Final sign-off authority" value={questionnaire.approval_authority} />
                  <QField label="Timeline: enquiry to contract" value={questionnaire.timeline_inquiry_to_contract} />
                  <QField label="Post-signing onboarding activities" value={questionnaire.post_signing_activities} />
                  <QField label="Timeline: signing to opening" value={questionnaire.timeline_signing_to_launch} />
                  <QField label="Biggest recruitment bottlenecks" value={questionnaire.process_bottlenecks} />
                  <QField label="Recruitment process self-rating (1–10)" value={questionnaire.recruitment_process_rating} />
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <p className="text-sm text-slate-400 text-center py-4">
                  No onboarding questionnaire submitted yet.
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        <div>
          <FranchisorStatusActions franchisor={franchisor} />
        </div>
      </div>
    </div>
  )
}
