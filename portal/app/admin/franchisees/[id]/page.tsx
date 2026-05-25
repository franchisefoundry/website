import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import { formatInvestmentRange, formatDate } from '@/lib/utils'
import { scoreColour, scoreLabel } from '@/lib/matching'
import FranchiseeActions from './actions'
import MeetingNotes from './MeetingNotes'
import DocumentsPanel from './DocumentsPanel'
import { FRANCHISEE_PIPELINE_STAGES, MATCH_PIPELINE_STAGES } from '@/lib/supabase/types'
import { ImpersonateButton } from '@/components/admin/ImpersonateButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FranchiseeDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: franchisee }, { data: franchisors }, { data: matches }, { data: documents }] = await Promise.all([
    admin
      .from('franchisee_profiles')
      .select('*, profiles!franchisee_profiles_user_id_fkey(full_name, email, phone)')
      .eq('id', id)
      .single(),
    admin
      .from('franchisor_profiles')
      .select('id, brand_name, category')
      .in('status', ['active', 'pending_review'])
      .order('brand_name'),
    admin
      .from('matches')
      .select('*, franchisor_profiles(id, brand_name, category, status)')
      .eq('franchisee_id', id)
      .order('score', { ascending: false }),

    admin
      .from('franchisee_documents')
      .select('*')
      .eq('franchisee_profile_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!franchisee) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = franchisee.profiles as any

  const assignedFranchisor  = franchisee.assigned_franchisor_id
    ? (franchisors ?? []).find(f => f.id === franchisee.assigned_franchisor_id) ?? null
    : null
  const backupFranchisor1 = (franchisee as any).backup_franchisor_1_id
    ? (franchisors ?? []).find(f => f.id === (franchisee as any).backup_franchisor_1_id) ?? null
    : null
  const backupFranchisor2 = (franchisee as any).backup_franchisor_2_id
    ? (franchisors ?? []).find(f => f.id === (franchisee as any).backup_franchisor_2_id) ?? null
    : null

  const currentStageIndex = FRANCHISEE_PIPELINE_STAGES.findIndex(s => s.value === (franchisee.pipeline_stage ?? 'new_enquiry'))

  const currentStage = FRANCHISEE_PIPELINE_STAGES[currentStageIndex]

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <PageHeader
          title={profile?.full_name || 'Franchisee detail'}
          description={profile?.email}
        />
        <div className="shrink-0 pt-1">
          <ImpersonateButton
            userId={franchisee.user_id}
            redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/franchisee/dashboard`}
            label="View as franchisee →"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-2 space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Profile</CardTitle>
                {statusBadge(franchisee.status)}
              </div>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="text-slate-500 mb-0.5">Investment budget</dt>
                  <dd className="font-medium">{formatInvestmentRange(franchisee.investment_min, franchisee.investment_max)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Liquid capital</dt>
                  <dd className="font-medium">{franchisee.liquid_capital != null ? `£${franchisee.liquid_capital.toLocaleString()}` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Preferred locations</dt>
                  <dd className="font-medium">{franchisee.preferred_locations?.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Operator model</dt>
                  <dd className="font-medium capitalize">{franchisee.operator_model?.replace('-', ' ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Experience</dt>
                  <dd className="font-medium capitalize">{franchisee.experience?.replace('-', ' ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Full-time available</dt>
                  <dd className="font-medium">{franchisee.full_time_available == null ? '—' : franchisee.full_time_available ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Multi-site interest</dt>
                  <dd className="font-medium">{franchisee.multi_site_interest ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Timeline</dt>
                  <dd className="font-medium">{franchisee.timeline_months ? `${franchisee.timeline_months} months` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Sectors</dt>
                  <dd className="font-medium">{franchisee.sectors?.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Format preferences</dt>
                  <dd className="font-medium">{franchisee.format_types?.join(', ') || '—'}</dd>
                </div>
                {franchisee.goals && (
                  <div className="col-span-2">
                    <dt className="text-slate-500 mb-0.5">Goals</dt>
                    <dd className="font-medium">{franchisee.goals}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          {/* Meeting Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting notes</CardTitle>
            </CardHeader>
            <CardBody>
              <MeetingNotes
                franchiseeId={id}
                initialNotes={franchisee.meeting_notes ?? null}
                initialRating={franchisee.internal_rating ?? null}
              />
            </CardBody>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardBody>
              <DocumentsPanel
                franchiseeId={id}
                initialDocs={(documents ?? []) as {
                  id: string
                  name: string
                  file_path: string
                  file_size: number | null
                  mime_type: string | null
                  shared_with_franchisor: boolean
                  created_at: string
                }[]}
              />
            </CardBody>
          </Card>

          {/* Matches */}
          <Card>
            <CardHeader>
              <CardTitle>Matches ({matches?.length ?? 0})</CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {matches?.length === 0 && (
                <p className="px-6 py-6 text-sm text-slate-400">No matches yet. Run matching to generate scores.</p>
              )}
              {matches?.map(m => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fr = m.franchisor_profiles as any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pipelineStage = MATCH_PIPELINE_STAGES.find(s => s.value === (m as any).pipeline_stage)
                return (
                  <div key={m.id} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{fr?.brand_name || 'Unnamed brand'}</p>
                        <p className="text-xs text-slate-400">{fr?.category}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {pipelineStage && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <span>{pipelineStage.emoji}</span>
                            <span>{pipelineStage.label}</span>
                          </span>
                        )}
                        {m.score > 0 && (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreColour(m.score)}`}>
                            {m.score}% — {scoreLabel(m.score)}
                          </span>
                        )}
                        {statusBadge(m.status)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Right column — actions */}
        <div>
          <FranchiseeActions
            franchisee={franchisee}
            franchisors={franchisors ?? []}
            assignedFranchisor={assignedFranchisor}
            backupFranchisor1={backupFranchisor1}
            backupFranchisor2={backupFranchisor2}
          />
        </div>
      </div>
    </div>
  )
}
