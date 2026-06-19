'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { statusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate, formatInvestmentRange, timeAgo } from '@/lib/utils'
import DeleteUserButton from '../DeleteUserButton'

interface FranchisorRow {
  id: string
  user_id: string | null
  brand_name: string | null
  category: string | null
  status: string | null
  investment_min: number | null
  investment_max: number | null
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any
}

export default function FranchisorsTable({
  franchisors,
  lastLoginMap = {},
}: {
  franchisors: FranchisorRow[]
  lastLoginMap?: Record<string, string | null>
}) {
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Brand</th>
              <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Investment</th>
              <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Added</th>
              <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">Last seen</th>
              <th className="px-4 sm:px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-slate-400 text-center">
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
                  <td className="px-4 sm:px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={f.brand_name} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-900">{f.brand_name || 'Incomplete profile'}</p>
                          {isPendingReview && (
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">Review needed</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{f.category || p?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-slate-600 hidden md:table-cell">
                    {formatInvestmentRange(f.investment_min, f.investment_max)}
                  </td>
                  <td className="px-4 sm:px-6 py-3">{statusBadge(f.status ?? 'unknown')}</td>
                  <td className="px-4 sm:px-6 py-3 text-slate-500 hidden sm:table-cell">{formatDate(f.created_at)}</td>
                  <td className="px-4 sm:px-6 py-3 hidden lg:table-cell">
                    <span className="text-slate-500 text-sm">{timeAgo(lastLoginMap[f.user_id ?? ''])}</span>
                  </td>
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
