'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { statusBadge } from '@/components/ui/badge'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { cn } from '@/lib/utils'
import { SearchIcon } from '@/components/icons'

/**
 * v5 CRM card grid for the Brands (franchisors) list — real data.
 * Mirrors the confirmed design's brand card (logo/identity, status, updates
 * badge, Fee / Candidates / Profile stats). Cards open the real record page.
 */
export interface BrandCard {
  id: string
  brand_name: string | null
  category: string | null
  email: string | null
  status: string | null
  logo_url: string | null
  fee: string
  cands: number
  prog: number
}

const FILTERS: [string, string][] = [
  ['all', 'All'],
  ['pending_review', 'Pending review'],
  ['active', 'Active'],
  ['draft', 'Draft'],
]

export default function FranchisorsCards({ brands }: { brands: BrandCard[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = brands.filter(b => {
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!((b.brand_name ?? '').toLowerCase().includes(q) ||
            (b.category ?? '').toLowerCase().includes(q) ||
            (b.email ?? '').toLowerCase().includes(q))) return false
    }
    if (filter !== 'all' && (b.status ?? '') !== filter) return false
    return true
  })

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <div className="flex items-center gap-2 bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink-3 flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="w-4 h-4 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search brands…"
            className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-3"
          />
        </div>
        <div className="inline-flex flex-wrap bg-surface border border-line rounded-xl p-1 gap-0.5">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                filter === value ? 'bg-ff-green text-white' : 'text-ink-2 hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-3 text-sm">No brands match this filter.</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
          {filtered.map(b => {
            const review = b.status === 'pending_review'
            return (
              <button
                key={b.id}
                onClick={() => router.push(`/admin/franchisors/${b.id}`)}
                className={cn(
                  'text-left bg-surface border rounded-2xl p-[17px] shadow-[0_1px_2px_rgba(27,33,26,0.04)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(27,33,26,0.08)] transition-all',
                  review ? 'border-[#e6cfa6]' : 'border-line hover:border-[#d6dace]',
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <BrandLogo src={b.logo_url} name={b.brand_name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink leading-tight truncate">{b.brand_name || 'Incomplete profile'}</p>
                    <p className="text-xs text-ink-3 truncate">{b.category || b.email || '—'}</p>
                  </div>
                </div>

                <div>{statusBadge(b.status ?? 'unknown')}</div>

                {review && (
                  <div className="mt-3 bg-ff-gold-soft rounded-[10px] px-3 py-2 text-xs font-medium text-ff-gold-ink flex items-center gap-1.5">
                    ✦ Awaiting your review
                  </div>
                )}

                <div className="flex gap-1.5 border-t border-line-2 pt-3 mt-3.5">
                  {[['Candidates', String(b.cands)], ['Profile', `${b.prog}%`]].map(([l, v]) => (
                    <div key={l} className="flex-1">
                      <p className="text-[15px] font-bold text-ink tabular-nums leading-none">{v}</p>
                      <p className="text-[10.5px] text-ink-3 mt-1">{l}</p>
                    </div>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
