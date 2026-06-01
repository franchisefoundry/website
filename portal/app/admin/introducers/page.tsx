import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import InviteAgentButton from './InviteIntroducerButton'

export default async function AdminIntroducersPage() {
  const admin = createAdminClient()

  const { data: introducers } = await admin
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('role', 'introducer')
    .order('created_at', { ascending: false })

  // Get lead counts per introducer
  const { data: leadCounts } = await admin
    .from('introducer_leads')
    .select('introducer_id, status')

  const countsByIntroducer: Record<string, { total: number; pending: number; active: number }> = {}
  ;(leadCounts ?? []).forEach(l => {
    if (!countsByIntroducer[l.introducer_id]) {
      countsByIntroducer[l.introducer_id] = { total: 0, pending: 0, active: 0 }
    }
    countsByIntroducer[l.introducer_id].total++
    if (l.status === 'submitted') countsByIntroducer[l.introducer_id].pending++
    if (['approved','invited','registered','matched','intro_made'].includes(l.status)) countsByIntroducer[l.introducer_id].active++
  })

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Manage agent accounts and their pipeline."
        action={<InviteAgentButton />}
      />

      {(introducers ?? []).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-3xl mb-3">👤</div>
          <p className="text-slate-800 font-semibold text-sm mb-1">No agents yet</p>
          <p className="text-slate-400 text-xs">Use the button above to invite your first agent.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Total leads</th>
                <th className="text-left px-4 py-3 font-medium">Not yet invited</th>
                <th className="text-left px-4 py-3 font-medium">Active</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(introducers ?? []).map(i => {
                const counts = countsByIntroducer[i.id] ?? { total: 0, pending: 0, active: 0 }
                return (
                  <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{i.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{i.email}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{counts.total}</td>
                    <td className="px-4 py-3">
                      {counts.pending > 0
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">{counts.pending}</span>
                        : <span className="text-slate-400">0</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{counts.active}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(i.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
