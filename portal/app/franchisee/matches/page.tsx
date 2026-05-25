import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { MATCH_PIPELINE_STAGES } from '@/lib/supabase/types'
import { formatInvestmentRange } from '@/lib/utils'

// Ordered pipeline stages for progress display
const JOURNEY_STAGES = MATCH_PIPELINE_STAGES

// What the franchisee should expect at each stage
const STAGE_GUIDANCE: Record<string, { title: string; body: string; cta?: string }> = {
  match_assigned: {
    title: 'Match identified — your consultant is preparing a briefing',
    body: 'Your Franchise Foundry consultant has identified this brand as a strong fit based on your profile. They\'ll reach out shortly to walk you through the details and answer any initial questions.',
  },
  match_approved: {
    title: 'Match confirmed — introduction being arranged',
    body: 'Your consultant has confirmed this is a great fit and is now arranging a warm introduction with the brand. Expect a call or email from us very soon to lock in a time.',
  },
  meeting_booked: {
    title: 'Introduction meeting booked — time to prepare',
    body: 'Your introduction meeting is booked. This is your chance to learn more about the brand, ask questions about the opportunity, and see if it feels right. Think about your goals, timeline, and any concerns you\'d like to raise.',
    cta: 'Prepare your questions for the meeting',
  },
  agreement_sent: {
    title: 'Franchise agreement sent — review carefully',
    body: 'A franchise agreement has been sent for your review. Take your time — this is an important document. Your consultant can help clarify anything, and we recommend having a solicitor review it before signing.',
    cta: 'Speak to your consultant about next steps',
  },
  agreement_signed: {
    title: '🎉 Agreement signed — welcome to the network!',
    body: 'Congratulations — you\'ve signed your franchise agreement and are officially part of the network. Your franchisor will be in touch with onboarding details. Exciting times ahead!',
  },
}

function PipelineProgress({ stage }: { stage: string | null }) {
  const currentIdx = JOURNEY_STAGES.findIndex(s => s.value === stage)
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {JOURNEY_STAGES.map((s, i) => (
          <div key={s.value} className="flex-1 flex flex-col gap-1 items-center">
            <div className={`h-2 w-full rounded-full transition-colors ${i <= currentIdx ? 'bg-brand-green' : 'bg-slate-100'}`} />
            <span className={`text-[9px] text-center leading-tight hidden sm:block ${
              i === currentIdx ? 'text-brand-green font-semibold' : 'text-slate-300'
            }`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
      {currentIdx >= 0 && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <span>{JOURNEY_STAGES[currentIdx].emoji}</span>
          <span className="font-medium text-slate-700">{JOURNEY_STAGES[currentIdx].label}</span>
          {currentIdx < JOURNEY_STAGES.length - 1 && (
            <span className="text-slate-400">→ next: {JOURNEY_STAGES[currentIdx + 1].label}</span>
          )}
        </p>
      )}
    </div>
  )
}

interface BrandCardProps {
  rank: 'primary' | 'backup'
  match: {
    id: string
    pipeline_stage: string | null
    franchisor_notes: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    franchisor_profiles: any
  } | null
  placeholder?: string
}

function BrandCard({ rank, match, placeholder }: BrandCardProps) {
  const fr = match?.franchisor_profiles
  const isPrimary = rank === 'primary'

  if (!match) {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-200 p-6 text-center ${isPrimary ? '' : 'opacity-60'}`}>
        <p className="text-sm text-slate-400">{placeholder ?? 'Not yet assigned'}</p>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden ${isPrimary ? 'border-brand-green/30 shadow-sm' : 'border-slate-200'}`}>
      {isPrimary && (
        <div className="bg-brand-green/5 border-b border-brand-green/10 px-5 py-2 flex items-center gap-2">
          <span className="text-brand-green text-xs font-semibold">⭐ Your primary match</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {fr?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fr.logo_url}
                alt=""
                className="w-10 h-10 rounded-xl object-contain border border-slate-100 p-0.5 bg-white"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green font-bold text-base">
                {fr?.category?.charAt(0) ?? '?'}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {fr?.brand_name ?? 'Confidential brand'}
              </p>
              <p className="text-xs text-slate-400">{fr?.category ?? '—'}</p>
            </div>
          </div>
        </div>

        {fr?.teaser && (
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">{fr.teaser}</p>
        )}

        {/* Key facts */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
          <div>
            <p className="text-slate-400 mb-0.5">Investment</p>
            <p className="font-medium text-slate-700">
              {fr?.investment_display || formatInvestmentRange(fr?.investment_min, fr?.investment_max) || '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Setup timeline</p>
            <p className="font-medium text-slate-700">
              {fr?.timeline_months ? `${fr.timeline_months} months` : '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">How you'd operate</p>
            <p className="font-medium text-slate-700 capitalize">
              {fr?.operator_model?.replace('-', ' ') || '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Experience needed</p>
            <p className="font-medium text-slate-700 capitalize">
              {fr?.experience_required === 'none' ? 'None required' : fr?.experience_required?.replace('-', ' ') || '—'}
            </p>
          </div>
        </div>

        {/* Pipeline progress */}
        {isPrimary && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2">Your journey with this brand</p>
            <PipelineProgress stage={match.pipeline_stage} />
          </div>
        )}

        {/* Stage-aware guidance */}
        {isPrimary && match.pipeline_stage && STAGE_GUIDANCE[match.pipeline_stage] && (
          <div className="mt-4 bg-brand-green/5 border border-brand-green/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-brand-green mb-1">
              {STAGE_GUIDANCE[match.pipeline_stage].title}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {STAGE_GUIDANCE[match.pipeline_stage].body}
            </p>
            {STAGE_GUIDANCE[match.pipeline_stage].cta && (
              <p className="mt-2 text-xs font-medium text-brand-green">
                → {STAGE_GUIDANCE[match.pipeline_stage].cta}
              </p>
            )}
          </div>
        )}

        {/* Franchisor notes (if any) */}
        {match.franchisor_notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Note from your consultant</p>
            <p className="text-xs text-slate-600 leading-relaxed">{match.franchisor_notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

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
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-sm">Your journey will appear here once you've had your consultation.</p>
        </div>
      </div>
    )
  }

  // Fetch match records for primary + backups
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
        .select(`
          id, pipeline_stage, franchisor_notes,
          franchisor_profiles(
            id, brand_name, category, teaser, logo_url,
            investment_min, investment_max, investment_display,
            timeline_months, operator_model, experience_required
          )
        `)
        .eq('franchisee_id', franchiseeProfile.id)
        .in('franchisor_id', assignedIds)
    : { data: [] }

  function matchFor(franchisorId: string | null | undefined) {
    if (!franchisorId) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (matches ?? []).find((m: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fr = m.franchisor_profiles as any
      return fr?.id === franchisorId
    }) ?? null
  }

  const primaryMatch  = matchFor(franchiseeProfile.assigned_franchisor_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backup1Match  = matchFor((franchiseeProfile as any).backup_franchisor_1_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backup2Match  = matchFor((franchiseeProfile as any).backup_franchisor_2_id)

  const hasAnyAssignment = assignedIds.length > 0

  return (
    <div>
      <PageHeader
        title="Your journey"
        description="Track where you are with your matched brands. Your consultant manages these on your behalf."
      />

      {!hasAnyAssignment ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-2xl">🗺️</div>
          <p className="text-slate-600 text-sm font-medium mb-1">Your journey starts here</p>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
            Your Franchise Foundry consultant will assign matched brands after your consultation.
            You&apos;ll be able to track your progress with each brand here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Primary brand */}
          <BrandCard rank="primary" match={primaryMatch as any} placeholder="Primary brand being confirmed…" />

          {/* Backup brands */}
          {(backup1Match || backup2Match ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (franchiseeProfile as any).backup_franchisor_1_id ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (franchiseeProfile as any).backup_franchisor_2_id) && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Backup options — in case your primary doesn&apos;t progress
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BrandCard rank="backup" match={backup1Match as any} placeholder="Backup option being identified…" />
                <BrandCard rank="backup" match={backup2Match as any} placeholder="Backup option being identified…" />
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500">
              Brand names are confirmed once an introduction is arranged. Speak to your consultant to discuss progress.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
