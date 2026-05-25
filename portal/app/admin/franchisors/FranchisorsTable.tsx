'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { statusBadge } from '@/components/ui/badge'
import { formatDate, formatInvestmentRange } from '@/lib/utils'
import DeleteUserButton from '../DeleteUserButton'

interface FranchisorRow {
  id: string
  brand_name: string | null
  category: string | null
  status: string | null
  investment_min: number | null
  investment_max: number | null
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any
}

export default function FranchisorsTable({ franchisors }: { franchisors: FranchisorRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? franchisors.filter(f =>
        (f.brand_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (f.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (f.profiles?.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : franchisors

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search brands by name, category or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent placeholder:text-slate-400"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Brand</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Investment</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Added</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-slate-400 text-center">
                  {search ? `No brands match "${search}"` : 'No franchisors yet.'}
                </td>
              </tr>
            )}
            {filtered.map(f => {
              const p = f.profiles
              const isPendingReview = f.status === 'pending_review'
              return (
                <tr
                  key={f.id}
                  onClick={() => router.push(`/admin/franchisors/${f.id}`)}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${isPendingReview ? 'bg-blue-50/40' : ''}`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      {isPendingReview && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Pending review" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{f.brand_name || 'Incomplete profile'}</p>
                        <p className="text-xs text-slate-400">{f.category || p?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {formatInvestmentRange(f.investment_min, f.investment_max)}
                  </td>
                  <td className="px-6 py-3">{statusBadge(f.status ?? 'unknown')}</td>
                  <td className="px-6 py-3 text-slate-500">{formatDate(f.created_at)}</td>
                  <td className="px-6 py-3" onClick={e => e.stopPropagation()}>
                    <DeleteUserButton
                      id={f.id}
                      name={f.brand_name || p?.email || 'franchisor'}
                      endpoint="/api/admin/franchisors/[id]"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
