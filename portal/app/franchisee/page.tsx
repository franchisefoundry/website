import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { scoreColour, scoreLabel } from '@/lib/matching'
import Link from 'next/link'

export default async function FranchiseeDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: franchiseeProfile }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('franchisee_profiles').select('*').eq('user_id', user!.id).single(),
  ])

  const profileId = franchiseeProfile?.id

  const [
    { data: matches },
    { count: strongMatchCount },
    { count: activeConversationCount },
    { count: passedCount },
  ] = await Promise.all([
    supabase
      .from('matches')
      .select('*, franchisor_profiles(brand_name, category, teaser, investment_display, locations_display)')
      .eq('franchisee_id', profileId ?? '')
      .in('status', ['shown', 'interested', 'intro_made'])
      .order('score', { ascending: false })
      .limit(3),
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('franchisee_id', profileId ?? '')
      .gte('score', 85)
      .neq('status', 'declined'),
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('franchisee_id', profileId ?? '')
      .in('status', ['interested', 'intro_made']),
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('franchisee_id', profileId ?? '')
      .eq('status', 'declined'),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const statCards = [
    { label: '85%+ matches',          count: strongMatchCount ?? 0,        colour: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Active conversations',  count: activeConversationCount ?? 0, colour: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-200'     },
    { label: 'Passed',                count: passedCount ?? 0,             colour: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200'   },
  ]

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your Franchise Foundry portal — matches, profile, and resources all in one place."
      />

      {/* Match stats */}
      {profileId && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {statCards.map(s => (
            <Link key={s.label} href="/franchisee/matches">
              <div className={`rounded-2xl border ${s.border} ${s.bg} p-5 hover:shadow-sm transition-shadow cursor-pointer`}>
                <p className={`text-2xl font-bold ${s.colour} mb-1`}>{s.count}</p>
                <p className="text-xs font-medium text-slate-600">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Matches preview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Your matches</h2>
          <Link href="/franchisee/matches" className="text-sm text-brand-green hover:underline">
            View all →
          </Link>
        </div>

        {matches?.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500 text-sm">
              Your matches will appear here once your consultant has reviewed your profile.
            </p>
            <p className="text-slate-400 text-xs mt-2">
              If you haven&apos;t already, complete your profile to help us find the best fit.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {matches?.map(m => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const fr = m.franchisor_profiles as any
              return (
                <Card key={m.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-semibold text-slate-900">Confidential brand</p>
                      <p className="text-xs text-slate-400">{fr?.category}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${scoreColour(m.score)}`}>
                      {m.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3 mb-3">{fr?.teaser}</p>
                  <div className="text-xs text-slate-500 space-y-1">
                    {fr?.investment_display && <p>{fr.investment_display}</p>}
                    {fr?.locations_display && <p>{fr.locations_display}</p>}
                  </div>
                  <p className="mt-3 text-xs font-medium text-brand-green">{scoreLabel(m.score)}</p>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/franchisee/profile">
          <Card className="p-5 hover:border-brand-green transition-colors cursor-pointer">
            <p className="text-sm font-semibold text-slate-900 mb-1">My profile</p>
            <p className="text-xs text-slate-500">
              Keep your investment range, location preferences and goals up to date for better matches.
            </p>
          </Card>
        </Link>
        <Link href="/franchisee/matches">
          <Card className="p-5 hover:border-brand-green transition-colors cursor-pointer">
            <p className="text-sm font-semibold text-slate-900 mb-1">All matches</p>
            <p className="text-xs text-slate-500">
              View your full list of matched brands in detail — investment, model, unit economics.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
