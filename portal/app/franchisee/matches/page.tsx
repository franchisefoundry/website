import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { MatchIcon } from '@/components/icons'
import { JourneyBrandCard, type JourneyBrandCardProps } from '@/components/franchisee/JourneyBrandCard'

export default async function FranchiseeJourneyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: franchiseeProfile } = await supabase
    .from('franchisee_profiles')
    .select('id, assigned_franchisor_id, backup_franchisor_1_id, backup_franchisor_2_id')
    .eq('user_id', user!.id)
    .single()

  if (!franchiseeProfile) {
    return (
      <div>
        <PageHeader title="Your journey" description="Track where you are with your matched brands." />
        <div className="bg-surface rounded-2xl border border-line p-12 text-center">
          <p className="text-ink-3 text-sm">Your journey will appear here once you&apos;ve had your consultation.</p>
        </div>
      </div>
    )
  }

  const assignedIds = [
    franchiseeProfile.assigned_franchisor_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (franchiseeProfile as any).backup_franchisor_1_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (franchiseeProfile as any).backup_franchisor_2_id,
  ].filter(Boolean) as string[]

  const { data: matches } = assignedIds.length > 0
    ? await supabase
        .from('matches')
        .select(`id, pipeline_stage, franchisor_notes,
          franchisor_profiles(id, brand_name, category, teaser, logo_url, investment_min, investment_max, investment_display, timeline_months, operator_model, experience_required)`)
        .eq('franchisee_id', franchiseeProfile.id)
        .in('franchisor_id', assignedIds)
    : { data: [] }

  function matchFor(franchisorId: string | null | undefined) {
    if (!franchisorId) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (matches ?? []).find((m: any) => (m.franchisor_profiles as any)?.id === franchisorId) ?? null
  }

  const primaryMatch = matchFor(franchiseeProfile.assigned_franchisor_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backup1Match = matchFor((franchiseeProfile as any).backup_franchisor_1_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backup2Match = matchFor((franchiseeProfile as any).backup_franchisor_2_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fpAny = franchiseeProfile as any
  const hasAnyAssignment = assignedIds.length > 0
  const hasBackups = backup1Match || backup2Match || fpAny.backup_franchisor_1_id || fpAny.backup_franchisor_2_id

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Your journey"
        description="Track where you are with your matched brands. Your consultant manages these on your behalf."
      />

      {!hasAnyAssignment ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-surface rounded-2xl border border-line">
          <div className="w-12 h-12 rounded-full bg-ff-green/10 flex items-center justify-center mx-auto mb-4">
            <MatchIcon className="w-6 h-6 text-ff-green" />
          </div>
          <p className="text-sm font-semibold text-ink mb-1">Your journey starts here</p>
          <p className="text-xs text-ink-3 leading-relaxed max-w-xs">
            Your Franchise Foundry consultant will assign matched brands after your consultation. You&apos;ll track your progress with each brand here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <JourneyBrandCard rank="primary" match={primaryMatch as JourneyBrandCardProps['match']} placeholder="Primary brand being confirmed…" />

          {hasBackups && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-3">Your alternative matches</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <JourneyBrandCard rank="backup" match={backup1Match as JourneyBrandCardProps['match']} placeholder="Backup option being identified…" delay={0.06} />
                <JourneyBrandCard rank="backup" match={backup2Match as JourneyBrandCardProps['match']} placeholder="Backup option being identified…" delay={0.12} />
              </div>
            </div>
          )}

          <div className="bg-surface-2 rounded-xl border border-line-2 p-4 text-center">
            <p className="text-xs text-ink-3">Brand names are confirmed once an introduction is arranged. Speak to your consultant to discuss progress.</p>
          </div>
        </div>
      )}
    </div>
  )
}
