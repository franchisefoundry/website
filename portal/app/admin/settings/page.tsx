import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Section } from '@/components/crm/Section'
import { MatchWeightsForm } from './MatchWeightsForm'
import type { Weights } from './actions'
import { DEFAULT_WEIGHTS } from '@/lib/matching'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const admin = createAdminClient()
  const { data: row } = await admin.from('match_weights').select('*').eq('id', 1).single()

  const weights: Weights = row
    ? { experience: row.experience, budget: row.budget, operator: row.operator, timeline: row.timeline, format: row.format, location: row.location, full_time: row.full_time, multi_site: row.multi_site }
    : { ...DEFAULT_WEIGHTS }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Tune how the matching engine scores franchisee ↔ brand fit." />
      <Section title="Match weighting">
        <p className="text-sm text-ink-2 mb-5 -mt-1">Set how much each dimension drives the fit score. Higher weight = more influence.</p>
        <MatchWeightsForm initial={weights} />
      </Section>
    </div>
  )
}
