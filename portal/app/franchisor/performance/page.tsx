import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { resolveBrand } from '@/lib/resolve-brand'
import { PerformanceView } from '@/components/franchisor/PerformanceView'

export default async function FranchisorPerformancePage() {
  const { brandProfile } = await resolveBrand()
  const admin = createAdminClient()

  const { data: rawMatches } = brandProfile
    ? await admin.from('matches')
        .select('id, status, pipeline_stage, score, franchisee_profiles(profiles!franchisee_profiles_user_id_fkey(role))')
        .eq('franchisor_id', brandProfile.id).eq('franchisor_revealed', true)
    : { data: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (rawMatches ?? []).filter(m => (m.franchisee_profiles as any)?.profiles?.role === 'franchisee')

  const total = matches.length
  const interested = matches.filter(m => m.status === 'interested' || m.status === 'intro_made').length
  const intros = matches.filter(m => m.status === 'intro_made').length
  const meetings = matches.filter(m => m.pipeline_stage === 'meeting_booked').length
  const agreements = matches.filter(m => m.pipeline_stage === 'agreement_sent' || m.pipeline_stage === 'agreement_signed').length
  const avgScore = total ? Math.round(matches.reduce((n, m) => n + (m.score ?? 0), 0) / total) : 0

  const kpis = [
    { n: total, l: 'Candidates matched' },
    { n: avgScore, l: 'Avg fit score', suffix: '%' },
    { n: interested, l: 'You’re interested' },
    { n: intros, l: 'Intros arranged' },
  ]
  const funnel = [
    ['Matched', total], ['Interested', interested], ['Intro made', intros], ['Meeting', meetings], ['Agreement', agreements],
  ] as [string, number][]

  return (
    <div className="max-w-4xl">
      <PageHeader title="Performance" description="How your brand is doing across the recruitment funnel." />
      <PerformanceView kpis={kpis} funnel={funnel} />
    </div>
  )
}
