'use client'

import Link from 'next/link'
import { FRANCHISEE_PIPELINE_STAGES } from '@/lib/supabase/types'
import { formatInvestmentRange } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'

interface Franchisee {
  id: string
  investment_min: number | null
  investment_max: number | null
  pipeline_stage: string | null
  status: string
  internal_rating: number | null
  profiles: { full_name: string | null; email: string | null } | null
}

// 4 meta-buckets — each contains ordered sub-stages from FRANCHISEE_PIPELINE_STAGES
const BUCKETS = [
  {
    key: 'new',
    label: 'New',
    colour: 'bg-sky-500',
    headerBg: 'bg-sky-50',
    headerBorder: 'border-sky-100',
    countBg: 'bg-sky-100 text-sky-700',
    stages: ['new_enquiry', 'meeting_booked'],
  },
  {
    key: 'active',
    label: 'Active',
    colour: 'bg-amber-400',
    headerBg: 'bg-amber-50',
    headerBorder: 'border-amber-100',
    countBg: 'bg-amber-100 text-amber-700',
    stages: ['profile_complete', 'matches_sent'],
  },
  {
    key: 'in_play',
    label: 'In Play',
    colour: 'bg-emerald-500',
    headerBg: 'bg-emerald-50',
    headerBorder: 'border-emerald-100',
    countBg: 'bg-emerald-100 text-emerald-700',
    stages: ['brand_shortlisted', 'intro_made'],
  },
  {
    key: 'closing',
    label: 'Closing',
    colour: 'bg-violet-500',
    headerBg: 'bg-violet-50',
    headerBorder: 'border-violet-100',
    countBg: 'bg-violet-100 text-violet-700',
    stages: ['agreement_sent', 'signed'],
  },
] as const

// Map stage value → label for the sub-stage pill on each card
const STAGE_LABELS: Record<string, { label: string; emoji: string }> = Object.fromEntries(
  FRANCHISEE_PIPELINE_STAGES.map(s => [s.value, { label: s.label, emoji: s.emoji }])
)

const STATUS_DOT: Record<string, string> = {
  active:   'bg-emerald-400',
  pending:  'bg-amber-400',
  inactive: 'bg-slate-300',
  signed:   'bg-violet-400',
}

const RATING_COLOUR: Record<number, string> = {
  1: 'text-slate-300',
  2: 'text-amber-400',
  3: 'text-amber-500',
  4: 'text-emerald-500',
  5: 'text-emerald-600',
}

function ratingStars(rating: number | null) {
  if (!rating) return null
  return (
    <span className={`text-[10px] tracking-tight ${RATING_COLOUR[rating] ?? 'text-slate-400'}`}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

export default function FranchiseeKanban({ franchisees }: { franchisees: Franchisee[] }) {
  // Assign each franchisee to a bucket
  const bucketMap = new Map<string, Franchisee[]>()
  BUCKETS.forEach(b => bucketMap.set(b.key, []))

  for (const f of franchisees) {
    const stage = f.pipeline_stage ?? 'new_enquiry'
    const bucket = BUCKETS.find(b => (b.stages as readonly string[]).includes(stage))
    if (bucket) bucketMap.get(bucket.key)!.push(f)
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {BUCKETS.map(bucket => {
        const cards = bucketMap.get(bucket.key) ?? []
        return (
          <div key={bucket.key} className="flex flex-col min-h-[480px]">
            {/* Column header */}
            <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border mb-3 ${bucket.headerBg} ${bucket.headerBorder}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${bucket.colour}`} />
                <span className="text-xs font-bold text-slate-700 tracking-wide">{bucket.label}</span>
              </div>
              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${bucket.countBg}`}>
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 flex-1">
              {cards.length === 0 ? (
                <div className="flex-1 rounded-xl border-2 border-dashed border-slate-100 flex items-center justify-center py-10">
                  <span className="text-xs text-slate-300">Empty</span>
                </div>
              ) : (
                cards.map(f => {
                  const stageInfo = STAGE_LABELS[f.pipeline_stage ?? 'new_enquiry']
                  return (
                    <Link
                      key={f.id}
                      href={`/admin/franchisees/${f.id}`}
                      className="group block bg-white rounded-xl border border-slate-200 p-3 hover:border-brand-green hover:shadow-sm transition-all"
                    >
                      {/* Avatar + name + status dot */}
                      <div className="flex items-start gap-2 mb-2">
                        <Avatar name={f.profiles?.full_name ?? null} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-brand-green transition-colors leading-snug line-clamp-1">
                              {f.profiles?.full_name || 'Pending setup'}
                            </p>
                            <span
                              className={`mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${STATUS_DOT[f.status] ?? 'bg-slate-300'}`}
                              title={f.status}
                            />
                          </div>
                          {f.profiles?.email && (
                            <p className="text-[10px] text-slate-400 truncate">{f.profiles.email}</p>
                          )}
                        </div>
                      </div>

                      {/* Sub-stage pill */}
                      {stageInfo && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5 mb-2">
                          <span>{stageInfo.emoji}</span>
                          <span>{stageInfo.label}</span>
                        </span>
                      )}

                      {/* Budget + rating row */}
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-500 font-medium">
                          {formatInvestmentRange(f.investment_min, f.investment_max) || '—'}
                        </p>
                        {ratingStars(f.internal_rating)}
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
