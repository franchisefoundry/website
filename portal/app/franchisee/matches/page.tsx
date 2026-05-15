import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { scoreColour, scoreLabel } from '@/lib/matching'
import { formatInvestmentRange } from '@/lib/utils'

export default async function FranchiseeMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: franchiseeProfile } = await supabase
    .from('franchisee_profiles')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      franchisor_profiles(
        brand_name, category, teaser, highlights,
        investment_min, investment_max, investment_display,
        locations_display, timeline_months,
        operator_model, experience_required,
        full_time_required, multi_site_ready, format
      )
    `)
    .eq('franchisee_id', franchiseeProfile?.id)
    .in('status', ['shown', 'interested', 'intro_made'])
    .order('score', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Your matches"
        description="Brands scored against your profile. Brand names are revealed in your consultation."
      />

      {matches?.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-slate-500">No matches to show yet.</p>
          <p className="text-slate-400 text-sm mt-1">
            Your consultant will share matches with you after reviewing your profile.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches?.map(m => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fr = m.franchisor_profiles as any
            return (
              <Card key={m.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-slate-900">Confidential brand</h3>
                      <Badge variant="default">{fr?.category}</Badge>
                      {m.status === 'interested' && <Badge variant="success">You&apos;re interested</Badge>}
                      {m.status === 'intro_made' && <Badge variant="gold">Intro arranged</Badge>}
                    </div>
                    <p className="text-sm text-slate-500">{fr?.locations_display}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className={`text-lg font-bold px-3 py-1.5 rounded-full ${scoreColour(m.score)}`}>
                      {m.score}%
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{scoreLabel(m.score)}</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-5">{fr?.teaser}</p>

                {/* Key facts */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-5">
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Investment required</p>
                    <p className="font-medium text-slate-800">
                      {fr?.investment_display || formatInvestmentRange(fr?.investment_min, fr?.investment_max)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Typical setup timeline</p>
                    <p className="font-medium text-slate-800">
                      {fr?.timeline_months ? `${fr.timeline_months} months` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">How you&apos;d operate</p>
                    <p className="font-medium text-slate-800 capitalize">
                      {fr?.operator_model?.replace('-', ' ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Experience needed</p>
                    <p className="font-medium text-slate-800 capitalize">
                      {fr?.experience_required === 'none' ? 'None required' : fr?.experience_required?.replace('-', ' ') || '—'}
                    </p>
                  </div>
                </div>

                {/* Highlights */}
                {fr?.highlights?.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-5">
                    <p className="text-xs font-medium text-slate-700 mb-2">Key points</p>
                    <ul className="space-y-1">
                      {fr.highlights.map((h: string, i: number) => (
                        <li key={i} className="text-xs text-slate-600 flex gap-2">
                          <span className="text-brand-green font-bold mt-0.5">•</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Brand details are kept confidential until we make the introduction.
                    Speak to your consultant to discuss this match further.
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
