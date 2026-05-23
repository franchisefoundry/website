'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface QuestionnaireRow {
  id: string
  franchisor_id: string
  completed_at: string | null
  created_at: string
  brand_name: string | null
  category: string | null
}

export default function QuestionnairesClient({ rows }: { rows: QuestionnaireRow[] }) {
  const [search, setSearch] = useState('')

  const filtered = rows.filter(r =>
    !search || (r.brand_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by brand name…"
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Brand</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Category</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Submitted</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-slate-400 text-center text-sm">
                  {search ? 'No brands match your search.' : 'No questionnaires submitted yet.'}
                </td>
              </tr>
            )}
            {filtered.map(row => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-900">{row.brand_name || 'Unnamed brand'}</td>
                <td className="px-6 py-3 text-slate-500">{row.category || '—'}</td>
                <td className="px-6 py-3 text-slate-500">
                  {row.completed_at ? formatDate(row.completed_at) : '—'}
                </td>
                <td className="px-6 py-3 text-right">
                  <Link
                    href={`/admin/franchisors/${row.franchisor_id}/questionnaire`}
                    className="text-brand-green text-xs hover:underline"
                  >
                    View answers →
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
