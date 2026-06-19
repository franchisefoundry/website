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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Brand</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Category</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Submitted</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-slate-400 text-center text-sm">
                  {search ? 'No brands match your search.' : 'No brands found.'}
                </td>
              </tr>
            )}
            {filtered.map(row => (
              <tr key={row.franchisor_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-900">{row.brand_name || 'Unnamed brand'}</td>
                <td className="px-6 py-3 text-slate-500">{row.category || '—'}</td>
                <td className="px-6 py-3">
                  {row.has_submission ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ Submitted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ⚠ Not submitted
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-slate-500">
                  {row.completed_at ? formatDate(row.completed_at) : '—'}
                </td>
                <td className="px-6 py-3 text-right">
                  <Link
                    href={`/admin/franchisors/${row.franchisor_id}/questionnaire`}
                    className="text-brand-green text-xs font-medium hover:underline"
                  >
                    {row.has_submission ? 'View & edit →' : 'Add answers →'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
