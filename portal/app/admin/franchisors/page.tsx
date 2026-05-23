import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { statusBadge } from '@/components/ui/badge'
import { formatDate, formatInvestmentRange } from '@/lib/utils'
import Link from 'next/link'
import InviteFranchisorButton from './invite-button'
import SeedFranchisorsButton from './seed-button'
import DeleteUserButton from '../DeleteUserButton'

export default async function FranchisorsPage() {
  const supabase = await createClient()

  const { data: franchisors } = await supabase
    .from('franchisor_profiles')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Franchisors"
        description="Brands onboarded to the network."
        action={
          <div className="flex gap-2 items-start">
            <SeedFranchisorsButton />
            <Link
              href="/admin/franchisors/new"
              className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Add brand
            </Link>
            <InviteFranchisorButton />
          </div>
        }
      />

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
            {franchisors?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-slate-400 text-center">
                  No franchisors yet.
                </td>
              </tr>
            )}
            {franchisors?.map(f => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = f.profiles as any
              return (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">{f.brand_name || 'Incomplete profile'}</p>
                    <p className="text-xs text-slate-400">{f.category || p?.email}</p>
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {formatInvestmentRange(f.investment_min, f.investment_max)}
                  </td>
                  <td className="px-6 py-3">{statusBadge(f.status)}</td>
                  <td className="px-6 py-3 text-slate-500">{formatDate(f.created_at)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/franchisors/${f.id}`} className="text-brand-green text-xs hover:underline">
                        View →
                      </Link>
                      <DeleteUserButton
                        id={f.id}
                        name={f.brand_name || p?.email || 'franchisor'}
                        endpoint="/api/admin/franchisors/[id]"
                      />
                    </div>
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
