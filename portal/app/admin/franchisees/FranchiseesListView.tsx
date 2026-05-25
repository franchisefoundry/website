'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { statusBadge } from '@/components/ui/badge'
import { formatDate, formatInvestmentRange } from '@/lib/utils'
import DeleteUserButton from '../DeleteUserButton'

interface FranchiseeRow {
  id: string
  investment_min: number | null
  investment_max: number | null
  status: string | null
  tier_2_unlocked: boolean | null
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any
}

export default function FranchiseesListView({ franchisees }: { franchisees: FranchiseeRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? franchisees.filter(f =>
        (f.profiles?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (f.profiles?.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : franchisees

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent placeholder:text-slate-400"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Budget</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Marketplace</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Joined</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-slate-400 text-center">
                  {search ? `No franchisees match "${search}"` : 'No franchisees yet.'}
                </td>
              </tr>
            )}
            {filtered.map(f => {
              const p = f.profiles
              return (
                <tr
                  key={f.id}
                  onClick={() => router.push(`/admin/franchisees/${f.id}`)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">{p?.full_name || 'Pending setup'}</p>
                    <p className="text-xs text-slate-400">{p?.email}</p>
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {formatInvestmentRange(f.investment_min, f.investment_max)}
                  </td>
                  <td className="px-6 py-3">{statusBadge(f.status ?? 'unknown')}</td>
                  <td className="px-6 py-3">
                    {f.tier_2_unlocked
                      ? <span className="text-emerald-600 text-xs font-medium">Unlocked</span>
                      : <span className="text-slate-400 text-xs">Locked</span>}
                  </td>
                  <td className="px-6 py-3 text-slate-500">{formatDate(f.created_at)}</td>
                  <td className="px-6 py-3" onClick={e => e.stopPropagation()}>
                    <DeleteUserButton
                      id={f.id}
                      name={p?.full_name || 'franchisee'}
                      endpoint="/api/admin/franchisees/[id]"
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
