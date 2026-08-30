import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { scoreColour, scoreLabel } from '@/lib/matching'
import { formatInvestmentRange } from '@/lib/utils'
import { resolveBrand } from '@/lib/resolve-brand'
import { CandidatesView, type Candidate } from './CandidatesView'

const operatorLabels: Record<string, string> = { 'owner-operator': 'Owner-operator', 'hire-manager': 'Hire a manager', 'either': 'Open to either' }
const experienceLabels: Record<string, string> = { none: 'No specific experience', management: 'Management background', 'food-beverage': 'F&B / hospitality' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stageIndex(m: any): number {
  if (m.pipeline_stage === 'agreement_sent' || m.pipeline_stage === 'agreement_signed') return 4
  if (m.pipeline_stage === 'meeting_booked') return 3
  if (m.status === 'intro_made') return 2
  if (m.status === 'interested') return 1
  return 0
}

export default async function FranchisorMatchesPage() {
  const { brandProfile } = await resolveBrand()
  const admin = createAdminClient()

  const { data: rawMatches } = brandProfile
    ? await admin.from('matches')
        .select(`*, franchisee_profiles(investment_min, investment_max, liquid_capital, preferred_locations, operator_model, experience, full_time_available, timeline_months, goals, profiles!franchisee_profiles_user_id_fkey(full_name, role))`)
        .eq('franchisor_id', brandProfile.id).eq('franchisor_revealed', true)
        .in('status', ['suggested', 'shown', 'interested', 'intro_made']).order('score', { ascending: false })
    : { data: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (rawMatches ?? []).filter(m => (m.franchisee_profiles as any)?.profiles?.role === 'franchisee')

  const candidates: Candidate[] = matches.map(m => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = m.franchisee_profiles as any
    const idx = stageIndex(m)
    const revealed = idx >= 2
    const locations: string[] = fc?.preferred_locations ?? []
    return {
      id: m.id, status: m.status, stageIndex: idx, score: m.score ?? 0,
      scoreLabel: scoreLabel(m.score ?? 0), scoreClass: scoreColour(m.score ?? 0),
      budget: formatInvestmentRange(fc?.investment_min, fc?.investment_max) || '—',
      liquidCapital: fc?.liquid_capital ? `£${Math.round(fc.liquid_capital / 1000)}k` : '—',
      timeline: fc?.timeline_months ? `${fc.timeline_months} months` : '—',
      operator: operatorLabels[fc?.operator_model] ?? '—',
      experience: experienceLabels[fc?.experience] ?? '—',
      fullTime: fc?.full_time_available === true ? 'Yes' : fc?.full_time_available === false ? 'No' : '—',
      locations,
      reasons: Array.isArray(m.match_reasons) ? m.match_reasons : [],
      goals: fc?.goals ?? null,
      displayName: revealed ? (fc?.profiles?.full_name?.split(' ')[0] ?? 'Candidate') : null,
      displayCity: revealed && locations.length > 0 ? locations[0] : null,
    }
  })

  return (
    <div className="max-w-4xl">
      <PageHeader title="Candidates" description="Qualified candidates matched to your brand — review and decide." />
      {brandProfile?.status !== 'active' && (
        <div className="bg-ff-gold-soft border border-[#e6cfa6] rounded-2xl px-5 py-4 text-sm text-ff-gold-ink mb-5">
          Your brand needs to be active before candidates are matched. We’ll notify you as soon as they appear.
        </div>
      )}
      {candidates.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <div className="text-3xl mb-3">👀</div>
          <p className="text-ink font-semibold text-sm mb-1">We’re looking for your first match</p>
          <p className="text-ink-3 text-xs max-w-sm mx-auto leading-relaxed">Our team is reviewing your brand and identifying qualified candidates. Strong fits will appear here to review.</p>
        </div>
      ) : (
        <CandidatesView candidates={candidates} />
      )}
    </div>
  )
}
