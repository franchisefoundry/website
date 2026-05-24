'use client'

import Link from 'next/link'
import { FRANCHISEE_PIPELINE_STAGES } from '@/lib/supabase/types'
import { formatInvestmentRange } from '@/lib/utils'

interface Franchisee {
  id: string
  investment_min: number | null
  investment_max: number | null
  pipeline_stage: string | null
  status: string
  internal_rating: number | null
  profiles: { full_name: string | null; email: string | null } | null
}

const STATUS_DOT: Record<string, string> = {
  active:         'bg-emerald-400',
  pending:        'bg-amber-400',
  inactive:       'bg-slate-300',
  signed:         'bg-violet-400',
}

const RATING_COLOUR: Record<number, string> = {
  1: 'text-slate-400',
  2: 'text-amber-400',
  3: 'text-amber-500',
  4: 'text-emerald-500',
  5: 'text-emerald-600',
}

function ratingStars(rating: number | null) {
  if (!rating) return null
  return (
    <span className={`text-xs font-semibold ${RATING_COLOUR[rating] ?? 'text-slate-400'}`}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

export default function FranchiseeKanban({ franchisees }: { franchisees: Franchisee[] }) {
  const byStage = (stageValue: string) =>
    franchisees.filter(f => (f.pipeline_stage ?? 'new_enquiry') === stageValue)

  return (
    <div className="overflow-x-auto pb-4 -mx-6 px-6">
      <div className="flex gap-3 min-w-max">
        {FRANCHISEE_PIPELINE_STAGES.map(stage => {
          const cards = byStage(stage.value)
          return (
            <div
              key={stage.value}
              className="flex flex-col w-56 flex-shrink-0"
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{stage.emoji}</span>
                  <span className="text-xs font-semibold text-slate-700 leading-tight">{stage.label}</span>
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 leading-none">
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-[120px]">
                {cards.length === 0 && (
                  <div className="flex-1 rounded-xl border-2 border-dashed border-slate-100 flex items-center justify-center py-8">
                    <span className="text-xs text-slate-300">Empty</span>
                  </div>
                )}
                {cards.map(f => (
                  <Link
                    key={f.id}
                    href={`/admin/franchisees/${f.id}`}
                    className="group block bg-white rounded-xl border border-slate-200 p-3 hover:border-brand-green hover:shadow-sm transition-all"
                  >
                    {/* Name + status dot */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-xs font-semibold text-slate-800 leading-snug group-hover:text-brand-green transition-colors line-clamp-2">
                        {f.profiles?.full_name || 'Pending setup'}
                      </p>
                      <span
                        className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${STATUS_DOT[f.status] ?? 'bg-slate-300'}`}
                        title={f.status}
                      />
                    </div>

                    {/* Email */}
                    {f.profiles?.email && (
                      <p className="text-[11px] text-slate-400 mb-2 truncate">{f.profiles.email}</p>
                    )}

                    {/* Budget */}
                    <p className="text-[11px] text-slate-500 font-medium">
                      {formatInvestmentRange(f.investment_min, f.investment_max)}
                    </p>

                    {/* Rating */}
                    {f.internal_rating && (
                      <div className="mt-1.5">{ratingStars(f.internal_rating)}</div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
