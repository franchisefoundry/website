import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { resolveBrand } from '@/lib/resolve-brand'
import { scoreColour } from '@/lib/matching'
import { PipelineBoard, type PipelineCard } from '@/components/franchisor/PipelineBoard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stageOf(m: any): string {
  const ps = m.pipeline_stage
  if (ps === 'agreement_sent' || ps === 'agreement_signed') return 'agreement'
  if (ps === 'meeting_booked') return 'meeting'
  if (m.status === 'intro_made') return 'intro'
  if (m.status === 'interested') return 'interested'
  return 'matched'
}

export default async function FranchisorPipelinePage() {
  const { brandProfile } = await resolveBrand()
  const admin = createAdminClient()

  const { data: rawMatches } = brandProfile
    ? await admin.from('matches')
        .select('id, status, pipeline_stage, score, franchisee_profiles(investment_min, investment_max, preferred_locations, profiles!franchisee_profiles_user_id_fkey(full_name, role))')
        .eq('franchisor_id', brandProfile.id).eq('franchisor_revealed', true)
    : { data: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (rawMatches ?? []).filter(m => (m.franchisee_profiles as any)?.profiles?.role === 'franchisee')

  const byStage: Record<string, PipelineCard[]> = { matched: [], interested: [], intro: [], meeting: [], agreement: [] }
  for (const m of matches) {
    const stage = stageOf(m)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = m.franchisee_profiles as any
    const revealed = stage !== 'matched' && stage !== 'interested'
    const name = revealed ? (fc?.profiles?.full_name?.split(' ')[0] ?? 'Candidate') : 'Confidential'
    const budget = fc?.investment_min && fc?.investment_max ? `£${Math.round(fc.investment_min / 1000)}–${Math.round(fc.investment_max / 1000)}k` : '—'
    byStage[stage].push({ id: m.id, name, score: m.score ?? 0, scoreCls: scoreColour(m.score), budget })
  }

  return (
    <div>
      <PageHeader title="Pipeline" description="Every candidate matched to your brand, by stage." />
      {matches.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center text-sm text-ink-3">
          No candidates in your pipeline yet — they’ll appear here as we match them.
        </div>
      ) : (
        <PipelineBoard byStage={byStage} />
      )}
    </div>
  )
}
