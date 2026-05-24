import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { scoreColour, scoreLabel } from '@/lib/matching'

export default async function FranchisorMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: brandProfile } = await supabase
    .from('franchisor_profiles')
    .select('id, status')
    .eq('user_id', user!.id)
    .single()

  // Use admin client scoped to this brand so we can join profiles and filter
  // out admin/test accounts. Brand ownership already verified above via supabase client.
  const adminClient = createAdminClient()
  const { data: rawMatches } = brandProfile
    ? await adminClient
        .from('matches')
        .select(`
          *,
          franchisee_profiles(
            investment_min, investment_max,
            preferred_locations, operator_model, experience,
            full_time_available, multi_site_interest,
            timeline_months, sectors, goals,
            profiles!franchisee_profiles_user_id_fkey(role)
          )
        `)
        .eq('franchisor_id', brandProfile.id)
        .in('status', ['suggested', 'shown', 'interested', 'intro_made'])
        .order('score', { ascending: false })
    : { data: [] }

  // Filter out admin/test accounts — only show genuine franchisee profiles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (rawMatches ?? []).filter(m => (m.franchisee_profiles as any)?.profiles?.role === 'franchisee')

  const statusLabel: Record<string, string> = {
    suggested:  'Incoming',
    shown:      'New',
    interested: 'Interested',
    intro_made: 'Intro arranged',
  }

  const operatorLabels: Record<string, string> = {
    'owner-operator': 'Owner-operator',
    'hire-manager':   'Hire a manager',
    'either':         'Either',
  }

  const experienceLabels: Record<string, string> = {
    'none':         'No specific experience',
    'management':   'Management background',
    'food-beverage':'F&B / hospitality',
  }

  return (
    <div>
      <PageHeader
        title="Matched candidates"
        description="Qualified franchisee candidates matched to your brand. Candidate identities are kept confidential until we make the introduction."
      />

      {brandProfile?.status !== 'active' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 mb-6">
          Your brand profile needs to be active before candidates are matched to you.
          Once activated by the Franchise Foundry team, matches will appear here.
        </div>
      )}

      {!matches?.length ? (
        <Card className="p-10 text-center">
          <p className="text-slate-500">No candidate matches yet.</p>
          <p className="text-slate-400 text-sm mt-1">
            When the Franchise Foundry team identifies strong candidates for your brand, they&apos;ll appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map(m => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fc = m.franchisee_profiles as any
            const locations: string[] = fc?.preferred_locations ?? []

            return (
              <Card key={m.id} className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-slate-900">Confidential candidate</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        m.status === 'intro_made'
                          ? 'bg-amber-100 text-amber-700'
                          : m.status === 'interested'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {statusLabel[m.status] ?? m.status}
                      </span>
                    </div>
                    {locations.length > 0 && (
                      <p className="text-sm text-slate-400 capitalize">
                        {locations.slice(0, 3).join(', ')}{locations.length > 3 ? ` +${locations.length - 3} more` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-lg font-bold px-3 py-1.5 rounded-full ${scoreColour(m.score)}`}>
                      {m.score}%
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{scoreLabel(m.score)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4">
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Investment budget</p>
                    <p className="font-medium text-slate-800">
                      {fc?.investment_min && fc?.investment_max
                        ? `£${(fc.investment_min / 1000).toFixed(0)}k – £${(fc.investment_max / 1000).toFixed(0)}k`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Operator preference</p>
                    <p className="font-medium text-slate-800">
                      {operatorLabels[fc?.operator_model] ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Experience</p>
                    <p className="font-medium text-slate-800">
                      {experienceLabels[fc?.experience] ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Timeline to open</p>
                    <p className="font-medium text-slate-800">
                      {fc?.timeline_months ? `${fc.timeline_months} months` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Full-time commitment</p>
                    <p className="font-medium text-slate-800">
                      {fc?.full_time_available === true ? 'Yes' : fc?.full_time_available === false ? 'No' : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Multi-site interest</p>
                    <p className="font-medium text-slate-800">
                      {fc?.multi_site_interest ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                {fc?.goals && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <p className="text-xs font-medium text-slate-700 mb-1">Candidate&apos;s goals</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{fc.goals}</p>
                  </div>
                )}

                {m.status === 'intro_made' ? (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-emerald-700 font-medium">
                      Introduction arranged — the Franchise Foundry team will connect you directly.
                    </p>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      Candidate identity is revealed when we arrange the introduction. Contact your Franchise Foundry consultant to progress this match.
                    </p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
