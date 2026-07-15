import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import Link from 'next/link'
import type { Lead } from '@/lib/supabase/types'
import DeleteLeadButton from './DeleteLeadButton'

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  meeting_requested: 'bg-amber-50 text-amber-700',
  converted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-slate-100 text-slate-500',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  meeting_requested: 'Meeting booked',
  converted: 'Approved',
  rejected: 'Rejected',
}

function SourceBadge({ lead, agentNames }: { lead: Lead; agentNames: Record<string, string> }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const introducerId = (lead as any).introducer_id as string | null
  if (introducerId) {
    return (
      <span className="inline-flex text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
        Agent · {agentNames[introducerId] ?? 'Referral'}
      </span>
    )
  }
  return <span className="text-xs text-slate-400">Matching platform</span>
}

function LeadsTable({ leads, agentNames }: { leads: Lead[]; agentNames: Record<string, string> }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-slate-500 text-xs">
            <th className="text-left px-4 py-3 font-medium">Name</th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
            <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Budget</th>
            <th className="text-left px-4 py-3 font-medium">Source</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => (
            <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800">{lead.full_name}</td>
              <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{lead.email}</td>
              <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                {lead.investment_min && lead.investment_max
                  ? `£${lead.investment_min.toLocaleString()} – £${lead.investment_max.toLocaleString()}`
                  : '—'}
              </td>
              <td className="px-4 py-3"><SourceBadge lead={lead} agentNames={agentNames} /></td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[lead.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABELS[lead.status] ?? lead.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-3">
                  <Link href={`/admin/leads/${lead.id}`} className="text-brand-green text-xs font-medium hover:underline">
                    View →
                  </Link>
                  <DeleteLeadButton leadId={lead.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function AdminLeadsPage() {
  const admin = createAdminClient()

  const { data: leads } = await admin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  const typedLeads = (leads ?? []) as Lead[]

  // Resolve referring agent names for the Source column
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agentIds = [...new Set(typedLeads.map(l => (l as any).introducer_id).filter(Boolean))] as string[]
  let agentNames: Record<string, string> = {}
  if (agentIds.length) {
    const { data: agents } = await admin.from('profiles').select('id, full_name').in('id', agentIds)
    agentNames = Object.fromEntries((agents ?? []).map(a => [a.id, a.full_name ?? 'Agent']))
  }

  const activeLeads = typedLeads.filter(l => l.status === 'new' || l.status === 'meeting_requested')
  const archivedLeads = typedLeads.filter(l => l.status === 'converted' || l.status === 'rejected')

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Quiz submissions from the public matching form."
      />

      {/* Active leads */}
      {activeLeads.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          No active leads. Share the <strong className="text-slate-600">/get-matched</strong> link to start collecting.
        </div>
      ) : (
        <LeadsTable leads={activeLeads} agentNames={agentNames} />
      )}

      {/* Archived — converted & rejected */}
      {archivedLeads.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Archived ({archivedLeads.length})
          </h2>
          <LeadsTable leads={archivedLeads} agentNames={agentNames} />
        </div>
      )}
    </div>
  )
}
