import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { statusBadge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import InviteUserButton from './invite-user-button'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: franchiseeCount },
    { count: franchisorCount },
    { count: pendingMatchCount },
    { count: pendingIntroCount },
    { data: recentFranchisees },
  ] = await Promise.all([
    supabase.from('franchisee_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('franchisor_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'suggested'),
    supabase.from('intro_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('franchisee_profiles')
      .select('id, status, created_at, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of the Franchise Foundry portal."
        action={<InviteUserButton />}
      />

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Franchisees" value={franchiseeCount ?? 0} />
        <StatCard label="Franchisors" value={franchisorCount ?? 0} />
        <StatCard label="Unreviewed matches" value={pendingMatchCount ?? 0} sub="need your attention" />
        <StatCard label="Pending intros" value={pendingIntroCount ?? 0} sub="waiting to be actioned" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Recent franchisees</h2>
          <Link href="/admin/franchisees" className="text-sm text-brand-green hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recentFranchisees?.length === 0 && (
            <p className="px-6 py-8 text-sm text-slate-400 text-center">No franchisees yet.</p>
          )}
          {recentFranchisees?.map(f => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = (f.profiles as any)
            return (
              <Link
                key={f.id}
                href={`/admin/franchisees/${f.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{p?.full_name || 'Unnamed'}</p>
                  <p className="text-xs text-slate-400">{p?.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(f.status)}
                  <span className="text-xs text-slate-400">{formatDate(f.created_at)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
