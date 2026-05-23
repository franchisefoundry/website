import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import { formatInvestmentRange } from '@/lib/utils'
import { createAdminClient } from '@/lib/supabase/admin'
import FranchisorStatusActions from './actions'
import MatchPipelineSelect from '@/app/admin/matches/match-pipeline-select'
import MatchStatusSelect from '@/app/admin/matches/match-status-select'
import Link from 'next/link'
import { MATCH_PIPELINE_STAGES } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ id: string }>
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
  const [{ data: questionnaire }, { data: matches }] = await Promise.all([
    admin.from('franchisor_questionnaires').select('completed_at').eq('franchisor_id', id).single(),
    admin
      .from('matches')
      .select('id, status, pipeline_stage, score, franchisee_profiles(id, profiles(full_name))')
      .eq('franchisor_id', id)
      .order('created_at', { ascending: false }),
  ])

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

          {/* Candidate pipeline */}
          {(matches?.length ?? 0) > 0 && (
            <Card>
              <CardHeader><CardTitle>Candidates ({matches!.length})</CardTitle></CardHeader>
              <div className="divide-y divide-slate-100">
                {matches!.map(m => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const franchisee = (m as any).franchisee_profiles as any
                  const name = franchisee?.profiles?.full_name || 'Unknown'
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const stage = MATCH_PIPELINE_STAGES.find(s => s.value === (m as any).pipeline_stage)
                  return (
                    <div key={m.id} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-900">{name}</p>
                        {stage && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            {stage.emoji} {stage.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <MatchStatusSelect matchId={m.id} currentStatus={m.status} />
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <MatchPipelineSelect matchId={m.id} currentStage={(m as any).pipeline_stage ?? null} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Questionnaire link card */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-0.5">Onboarding questionnaire</p>
                <p className="text-xs text-slate-400">
                  {questionnaire?.completed_at
                    ? `Submitted ${new Date(questionnaire.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : 'Not yet submitted'}
                </p>
              </div>
              <Link
                href={`/admin/franchisors/${id}/questionnaire`}
                className="text-sm font-medium text-brand-green hover:underline"
              >
                {questionnaire ? 'View / edit →' : 'Add answers →'}
              </Link>
            </div>
          </Card>
        </div>

        <div>
          <FranchisorStatusActions franchisor={franchisor} linkedUser={profile ?? null} />
        </div>
      </div>
    </div>
  )
}
