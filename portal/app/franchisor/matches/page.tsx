import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { scoreColour, scoreLabel } from '@/lib/matching'
import { formatInvestmentRange } from '@/lib/utils'
import { CandidateActions } from './CandidateActions'

export default async function FranchisorMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: brandProfile } = await supabase
    .from('franchisor_profiles')
    .select('id, status')
    .eq('user_id', user!.id)
    .single()

  const adminClient = createAdminClient()
  const { data: rawMatches } = brandProfile
    ? await adminClient
        .from('matches')
        .select(`
          *,
          franchisee_profiles(
            investment_min, investment_max, liquid_capital,
            preferred_locations, operator_model, experience,
            full_time_available, multi_site_interest,
            timeline_months, sectors, goals,
            profiles!franchisee_profiles_user_id_fkey(full_name, role)
          )
        `)
        .eq('franchisor_id', brandProfile.id)
        .in('status', ['suggested', 'shown', 'interested', 'intro_made'])
        .order('score', { ascending: false })
    : { data: [] }

  const matches = (rawMatches ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    m => (m.franchisee_profiles as any)?.profiles?.role === 'franchisee'
  )

  const operatorLabels: Record<string, string> = {
    'owner-operator': 'Owner-operator',
    'hire-manager':   'Hire a manager',
    'either':         'Open to either',
  }

  const experienceLabels: Record<string, string> = {
    'none':          'No specific experience',
    'management':    'Management background',
    'food-beverage': 'F&B / hospitality',
  }

  // Separate into buckets for cleaner display
  const incoming = matches.filter(m => m.status === 'suggested' || m.status === 'shown')
  const active   = matches.filter(m => m.status === 'interested')
  const intros   = matches.filter(m => m.status === 'intro_made')

  return (
    <div>
      <PageHeader
        title="Candidates"
        description="Qualified franchisee candidates the Franchise Foundry team has matched to your brand."
      />

      {brandProfile?.status !== 'active' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 mb-6">
          Your brand profile needs to be active before candidates are matched to you.
          Once reviewed by the Franchise Foundry team, candidates will appear here.
        </div>
      )}

      {matches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-3xl mb-3">👀</div>
          <p className="text-slate-800 font-semibold text-sm mb-1">We&apos;re looking for your first match</p>
          <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
            Our team is reviewing your brand and identifying qualified candidates.
            As soon as we find a strong fit, they&apos;ll appear here for you to review.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Intros made first */}
          {intros.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Intro arranged ({intros.length})
              </h2>
              <div className="space-y-3">
                {intros.map(m => <CandidateCard key={m.id} m={m} operatorLabels={operatorLabels} experienceLabels={experienceLabels} />)}
              </div>
            </section>
          )}

          {/* Active (interested) */}
          {active.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                You expressed interest ({active.length})
              </h2>
              <div className="space-y-3">
                {active.map(m => <CandidateCard key={m.id} m={m} operatorLabels={operatorLabels} experienceLabels={experienceLabels} />)}
              </div>
            </section>
          )}

          {/* New / incoming */}
          {incoming.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
                New candidates to review ({incoming.length})
              </h2>
              <div className="space-y-3">
                {incoming.map(m => <CandidateCard key={m.id} m={m} operatorLabels={operatorLabels} experienceLabels={experienceLabels} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function CandidateCard({
  m,
  operatorLabels,
  experienceLabels,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  m: any
  operatorLabels: Record<string, string>
  experienceLabels: Record<string, string>
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fc = m.franchisee_profiles as any
  const locations: string[] = fc?.preferred_locations ?? []
  const isIntro = m.status === 'intro_made'

  // Only reveal first name + first location after intro is arranged
  const displayName = isIntro
    ? (fc?.profiles?.full_name?.split(' ')[0] ?? 'Candidate')
    : null
  const displayCity = isIntro && locations.length > 0
    ? locations[0]
    : null

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${
      isIntro ? 'border-amber-200 shadow-sm' : 'border-slate-200'
    }`}>
      {isIntro && (
        <div className="bg-amber-50 border-b border-amber-100 px-5 py-2">
          <p className="text-xs font-semibold text-amber-700">🤝 Introduction arranged — your consultant will connect you shortly</p>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h3 className="text-base font-semibold text-slate-900">
                {isIntro && displayName ? `${displayName}, ${displayCity ?? 'UK'}` : 'Confidential candidate'}
              </h3>
              {!isIntro && locations.length > 0 && (
                <span className="text-xs text-slate-400">
                  {locations.slice(0, 2).join(', ')}{locations.length > 2 ? ` +${locations.length - 2}` : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isIntro ? 'Identity revealed after introduction' : 'Identity kept confidential until introduction'}
            </p>
          </div>
          {m.score > 0 && (
            <div className="text-right shrink-0">
              <span className={`text-lg font-bold px-3 py-1.5 rounded-full ${scoreColour(m.score)}`}>
                {m.score}%
              </span>
              <p className="text-xs text-slate-400 mt-1">{scoreLabel(m.score)}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Investment budget</p>
            <p className="font-medium text-slate-800 text-sm">
              {formatInvestmentRange(fc?.investment_min, fc?.investment_max) || '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Liquid capital</p>
            <p className="font-medium text-slate-800 text-sm">
              {fc?.liquid_capital ? `£${Math.round(fc.liquid_capital / 1000)}k` : '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Timeline to open</p>
            <p className="font-medium text-slate-800 text-sm">
              {fc?.timeline_months ? `${fc.timeline_months} months` : '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Operator model</p>
            <p className="font-medium text-slate-800 text-sm">
              {operatorLabels[fc?.operator_model] ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Experience</p>
            <p className="font-medium text-slate-800 text-sm">
              {experienceLabels[fc?.experience] ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Full-time</p>
            <p className="font-medium text-slate-800 text-sm">
              {fc?.full_time_available === true ? 'Yes' : fc?.full_time_available === false ? 'No' : '—'}
            </p>
          </div>
        </div>

        {fc?.goals && (
          <div className="bg-slate-50 rounded-xl p-3.5 mb-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Their goals</p>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{fc.goals}</p>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100">
          <CandidateActions matchId={m.id} currentStatus={m.status} />
        </div>
      </div>
    </div>
  )
}
