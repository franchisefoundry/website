import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { statusBadge } from '@/components/ui/badge'
import { formatDate, formatInvestmentRange } from '@/lib/utils'
import Link from 'next/link'
import InviteFranchiseeButton from './invite-button'
import DeleteUserButton from '../DeleteUserButton'
import FranchiseeKanban from './FranchiseeKanban'
import ViewToggle from './ViewToggle'

interface SearchParams { view?: string }

export default async function FranchiseesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { view } = await searchParams
  const isKanban = view !== 'list'   // kanban is the default

  const admin = createAdminClient()

  // Use explicit FK hint — franchisee_profiles has two FKs to profiles
  const { data: allFranchisees } = await admin
    .from('franchisee_profiles')
    .select('*, profiles!franchisee_profiles_user_id_fkey(full_name, email, phone, role)')
    .order('created_at', { ascending: false })

  // Only show users whose profile role is 'franchisee'
  const franchisees = (allFranchisees ?? []).filter(f => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (f.profiles as any)?.role === 'franchisee'
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kanbanData = franchisees.map(f => ({
    id: f.id,
    investment_min: f.investment_min,
    investment_max: f.investment_max,
    pipeline_stage: f.pipeline_stage ?? null,
    status: f.status,
    internal_rating: (f as any).internal_rating ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profiles: (f.profiles as any) ?? null,
  }))

  return (
    <div>
      <PageHeader
        title="Franchisees"
        description="Everyone in the portal — active, pending and signed."
        action={
          <div className="flex items-center gap-3">
            <ViewToggle current={isKanban ? 'kanban' : 'list'} />
            <InviteFranchiseeButton />
          </div>
        }
      />

      {franchisees.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          No franchisees yet. Invite one to get started.
        </div>
      ) : isKanban ? (
        <FranchiseeKanban franchisees={kanbanData} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Budget</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tier 2</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {franchisees.map(f => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p = (f.profiles as any)
                return (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-900">{p?.full_name || 'Pending setup'}</p>
                      <p className="text-xs text-slate-400">{p?.email}</p>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {formatInvestmentRange(f.investment_min, f.investment_max)}
                    </td>
                    <td className="px-6 py-3">{statusBadge(f.status)}</td>
                    <td className="px-6 py-3">
                      {f.tier_2_unlocked
                        ? <span className="text-emerald-600 text-xs font-medium">Unlocked</span>
                        : <span className="text-slate-400 text-xs">Locked</span>}
                    </td>
                    <td className="px-6 py-3 text-slate-500">{formatDate(f.created_at)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/franchisees/${f.id}`} className="text-brand-green text-xs hover:underline">
                          View →
                        </Link>
                        <DeleteUserButton
                          id={f.id}
                          name={p?.full_name || 'franchisee'}
                          endpoint="/api/admin/franchisees/[id]"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
