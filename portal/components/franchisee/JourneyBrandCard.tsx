import { MATCH_PIPELINE_STAGES } from '@/lib/supabase/types'
import { formatInvestmentRange } from '@/lib/utils'
import { StageTracker } from '@/components/crm/StageTracker'
import { StarIcon } from '@/components/icons'

// What the franchisee should expect at each stage.
export const STAGE_GUIDANCE: Record<string, { title: string; body: string; cta?: string }> = {
  match_assigned: {
    title: 'Match identified — your consultant is preparing a briefing',
    body: "Your Franchise Foundry consultant has identified this brand as a strong fit based on your profile. They'll reach out shortly to walk you through the details and answer any initial questions.",
  },
  match_approved: {
    title: 'Match confirmed — introduction being arranged',
    body: 'Your consultant has confirmed this is a great fit and is now arranging a warm introduction with the brand. Expect a call or email from us very soon to lock in a time.',
  },
  meeting_booked: {
    title: 'Introduction meeting booked — time to prepare',
    body: "This is your chance to learn more about the brand, ask questions about the opportunity, and see if it feels right. Think about your goals, timeline, and any concerns you'd like to raise.",
    cta: 'Prepare your questions for the meeting',
  },
  agreement_sent: {
    title: 'Franchise agreement sent — review carefully',
    body: 'Take your time — this is an important document. Your consultant can help clarify anything, and we recommend having a solicitor review it before signing.',
    cta: 'Speak to your consultant about next steps',
  },
  agreement_signed: {
    title: 'Agreement signed — welcome to the network',
    body: "Congratulations — you've signed your franchise agreement and are officially part of the network. Your franchisor will be in touch with onboarding details.",
  },
}

export interface JourneyBrandCardProps {
  rank: 'primary' | 'backup'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match: { id: string; pipeline_stage: string | null; franchisor_notes: string | null; franchisor_profiles: any } | null
  placeholder?: string
  delay?: number
}

/** A matched-brand card for the franchisee journey. No brand logo — matches stay
 *  anonymous until the brand is revealed. */
export function JourneyBrandCard({ rank, match, placeholder, delay = 0 }: JourneyBrandCardProps) {
  const fr = match?.franchisor_profiles
  const isPrimary = rank === 'primary'
  const stageIdx = match ? MATCH_PIPELINE_STAGES.findIndex(s => s.value === match.pipeline_stage) : -1
  const nextStage = stageIdx >= 0 && stageIdx < MATCH_PIPELINE_STAGES.length - 1 ? MATCH_PIPELINE_STAGES[stageIdx + 1] : null
  const guidance = match?.pipeline_stage ? STAGE_GUIDANCE[match.pipeline_stage] : null

  if (!match) {
    return (
      <div className={`rise rounded-2xl border border-dashed border-line p-6 text-center ${isPrimary ? '' : 'opacity-70'}`} style={{ animationDelay: `${delay}s` }}>
        <p className="text-sm text-ink-3">{placeholder ?? 'Not yet assigned'}</p>
      </div>
    )
  }

  return (
    <div className={`rise bg-surface border rounded-2xl overflow-hidden ${isPrimary ? 'border-ff-green/25 shadow-[0_14px_34px_rgba(27,33,26,0.08)]' : 'border-line shadow-[0_1px_2px_rgba(27,33,26,0.05)]'}`} style={{ animationDelay: `${delay}s` }}>
      {isPrimary && <div className="h-1 bg-gradient-to-r from-ff-gold to-[#e8c9a0]" />}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-ff-green/10 flex items-center justify-center text-ff-green font-bold text-base flex-shrink-0">
            {fr?.category?.charAt(0) ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            {isPrimary && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ff-gold-ink bg-ff-gold-soft rounded-full px-2 py-0.5 mb-1">
                <StarIcon className="w-3 h-3" /> Your primary match
              </span>
            )}
            <p className="text-sm font-semibold text-ink leading-tight">{fr?.brand_name ?? 'Confidential brand'}</p>
            <p className="text-xs text-ink-3">{fr?.category ?? '—'}</p>
          </div>
        </div>

        {fr?.teaser && <p className="text-sm text-ink-2 mb-4 leading-relaxed">{fr.teaser}</p>}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-1">
          <div><p className="text-ink-3 mb-0.5 text-xs">Investment</p><p className="text-sm font-semibold text-ink tabular-nums">{fr?.investment_display || formatInvestmentRange(fr?.investment_min, fr?.investment_max) || '—'}</p></div>
          <div><p className="text-ink-3 mb-0.5 text-xs">Setup timeline</p><p className="text-sm font-semibold text-ink">{fr?.timeline_months ? `${fr.timeline_months} months` : '—'}</p></div>
          <div><p className="text-ink-3 mb-0.5 text-xs">How you&apos;d operate</p><p className="text-sm font-semibold text-ink capitalize">{fr?.operator_model?.replace('-', ' ') || '—'}</p></div>
          <div><p className="text-ink-3 mb-0.5 text-xs">Experience needed</p><p className="text-sm font-semibold text-ink capitalize">{fr?.experience_required === 'none' ? 'None required' : fr?.experience_required?.replace('-', ' ') || '—'}</p></div>
        </div>

        {isPrimary && stageIdx >= 0 && (
          <div className="pt-4 mt-4 border-t border-line-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-3">Your journey with this brand</p>
            <StageTracker stages={MATCH_PIPELINE_STAGES} currentIndex={stageIdx} />
            <p className="text-sm text-ink-2 mt-3">
              You&apos;re at <span className="font-semibold text-ink">{MATCH_PIPELINE_STAGES[stageIdx].label}</span>
              {nextStage && <span className="text-ink-3"> — next: {nextStage.label}</span>}.
            </p>
          </div>
        )}

        {isPrimary && guidance && (
          <div className="mt-4 bg-ff-green/[0.06] border border-ff-green/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-ff-green mb-1">{guidance.title}</p>
            <p className="text-xs text-ink-2 leading-relaxed">{guidance.body}</p>
            {guidance.cta && <p className="mt-2 text-xs font-medium text-ff-green">→ {guidance.cta}</p>}
          </div>
        )}

        {match.franchisor_notes && (
          <div className="mt-4 pt-4 border-t border-line-2">
            <p className="text-[10px] font-bold text-ink-3 uppercase tracking-wide mb-1">Note from your consultant</p>
            <p className="text-xs text-ink-2 leading-relaxed">{match.franchisor_notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
