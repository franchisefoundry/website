import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import { formatInvestmentRange, formatDate } from '@/lib/utils'
import { scoreLabel, scoreColour } from '@/lib/matching'
import FranchiseeActions from './actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FranchiseeDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: franchisee } = await supabase
    .from('franchisee_profiles')
    .select('*, profiles(full_name, email, phone)')
    .eq('id', id)
    .single()

  if (!franchisee) notFound()

  const { data: matches } = await supabase
    .from('matches')
    .select('*, franchisor_profiles(brand_name, category, status)')
    .eq('franchisee_id', id)
    .order('score', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = franchisee.profiles as any

  return (
    <div>
      <PageHeader
        title={profile?.full_name || 'Franchisee detail'}
        description={profile?.email}
      />

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
                {franchisee.goals && (
                  <div className="col-span-2">
                    <dt className="text-slate-500 mb-0.5">Goals</dt>
                    <dd className="font-medium">{franchisee.goals}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          {/* Matches */}
          <Card>
            <CardHeader>
              <CardTitle>Matches ({matches?.length ?? 0})</CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {matches?.length === 0 && (
                <p className="px-6 py-6 text-sm text-slate-400">No matches assigned yet.</p>
              )}
              {matches?.map(m => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fr = m.franchisor_profiles as any
                return (
                  <div key={m.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{fr?.brand_name || 'Unnamed brand'}</p>
                      <p className="text-xs text-slate-400">{fr?.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreColour(m.score)}`}>
                        {m.score}% — {scoreLabel(m.score)}
                      </span>
                      {statusBadge(m.status)}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Right column — actions */}
        <div>
          <FranchiseeActions franchisee={franchisee} />
        </div>
      </div>
    </div>
  )
}
