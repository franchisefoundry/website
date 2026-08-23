'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { statusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatDate, formatInvestmentRange, timeAgo } from '@/lib/utils'
import { FRANCHISEE_PIPELINE_STAGES } from '@/lib/supabase/types'
import { franchiseeStageIndex, franchiseeStageProgress } from '@/lib/crm/pipeline'
import { SearchIcon } from '@/components/icons'

/**
 * v5 CRM card grid for the Franchisees list — the real screen, real data.
 * Mirrors the confirmed design's `.ncard` (avatar + identity, stage pill,
 * green progress tracker, footer action) on the portal's own tokens. Cards open
 * the real record page; search + stage filters run client-side.
 */
export interface FranchiseeCard {
  id: string
  full_name: string | null
  email: string | null
  investment_min: number | null
  investment_max: number | null
  status: string | null
  pipeline_stage: string | null
  created_at: string
  last_seen: string | null
}

export default function FranchiseesCards({ franchisees }: { franchisees: FranchiseeCard[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<string>('all')

  const filtered = franchisees.filter(f => {
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!((f.full_name ?? '').toLowerCase().includes(q) || (f.email ?? '').toLowerCase().includes(q))) return false
    }
    if (stage !== 'all' && (f.pipeline_stage ?? 'new_enquiry') !== stage) return false
    return true
  })

  const chip = (value: string, label: string) => (
    <button
      key={value}
      onClick={() => setStage(value)}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
        stage === value ? 'bg-ff-green text-white' : 'text-ink-2 hover:text-ink',
      )}
    >
      {label}
    </button>
  )

  return (
    <div>
      {/* Toolbar: search + stage filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <div className="flex items-center gap-2 bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink-3 flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="w-4 h-4 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search franchisees…"
            className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-3"
          />
        </div>
        <div className="inline-flex flex-wrap bg-surface border border-line rounded-xl p-1 gap-0.5">
          {chip('all', 'All')}
          {FRANCHISEE_PIPELINE_STAGES.map(s => chip(s.value, s.label))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-3 text-sm">
          {search || stage !== 'all' ? 'No franchisees match this filter.' : 'No franchisees yet.'}
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
          {filtered.map(f => {
            const idx = franchiseeStageIndex(f.pipeline_stage as never)
            const st = FRANCHISEE_PIPELINE_STAGES[idx]
            const prog = Math.round(franchiseeStageProgress(f.pipeline_stage as never) * 100)
            return (
              <button
                key={f.id}
                onClick={() => router.push(`/admin/franchisees/${f.id}`)}
                className="text-left bg-surface border border-line rounded-2xl p-[17px] shadow-[0_1px_2px_rgba(27,33,26,0.04)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(27,33,26,0.08)] hover:border-[#d6dace] transition-all"
              >
                <div className="flex items-center gap-3 mb-3.5">
                  <Avatar name={f.full_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink leading-tight truncate">{f.full_name || 'Pending setup'}</p>
                    <p className="text-xs text-ink-3 truncate">{f.email || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2.5">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-ff-green/10 text-ff-green">
                    <span>{st.emoji}</span>{st.label}
                  </span>
                  {statusBadge(f.status ?? 'unknown')}
                </div>

                <div className="h-1.5 rounded-full bg-line overflow-hidden">
                  <div className="h-full bg-ff-green rounded-full transition-all" style={{ width: `${prog}%` }} />
                </div>

                <p className="text-xs text-ink-2 mt-2.5">
                  {formatInvestmentRange(f.investment_min, f.investment_max)}
                </p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-line-2">
                  <span className="text-xs text-ink-3">
                    {f.last_seen ? `Seen ${timeAgo(f.last_seen)}` : `Joined ${formatDate(f.created_at)}`}
                  </span>
                  <span className="text-xs font-medium text-ff-green">Open →</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
