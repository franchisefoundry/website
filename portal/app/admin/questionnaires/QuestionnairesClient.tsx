'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface QuestionnaireRow {
  id: string | null
  franchisor_id: string
  completed_at: string | null
  created_at: string | null
  brand_name: string | null
  category: string | null
  has_submission: boolean
}

export default function QuestionnairesClient({ rows }: { rows: QuestionnaireRow[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'submitted' | 'missing'>('all')

  const filtered = rows.filter(r => {
    if (search && !(r.brand_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'submitted' && !r.has_submission) return false
    if (filter === 'missing' && r.has_submission) return false
    return true
  })

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by brand name…"
          className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
        />
        <div className="flex gap-1">
          {(['all', 'submitted', 'missing'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                filter === f
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All brands' : f === 'submitted' ? '✓ Submitted' : '⚠ Missing'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-3 text-sm">
          {search ? 'No brands match your search.' : 'No brands found.'}
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {filtered.map(row => (
            <Link
              key={row.franchisor_id}
              href={`/admin/franchisors/${row.franchisor_id}/questionnaire`}
              className="block bg-surface border border-line rounded-2xl p-[17px] shadow-[0_1px_2px_rgba(27,33,26,0.04)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(27,33,26,0.08)] hover:border-[#d6dace] transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{row.brand_name || 'Unnamed brand'}</p>
                  <p className="text-xs text-ink-3 truncate">{row.category || '—'}</p>
                </div>
                {row.has_submission ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">✓ Submitted</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">⚠ Missing</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-line-2">
                <span className="text-xs text-ink-3">{row.completed_at ? formatDate(row.completed_at) : 'Not submitted'}</span>
                <span className="text-xs font-medium text-ff-green">{row.has_submission ? 'View & edit →' : 'Add answers →'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
