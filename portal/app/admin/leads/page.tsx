import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Avatar } from '@/components/ui/Avatar'
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

function LeadsGrid({ leads, agentNames }: { leads: Lead[]; agentNames: Record<string, string> }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
      {leads.map(lead => (
        <div key={lead.id} className="bg-surface border border-line rounded-2xl p-[17px] shadow-[0_1px_2px_rgba(27,33,26,0.04)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(27,33,26,0.08)] hover:border-[#d6dace] transition-all">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={lead.full_name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink leading-tight truncate">{lead.full_name}</p>
              <p className="text-xs text-ink-3 truncate">{lead.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[lead.status] ?? 'bg-slate-100 text-slate-500'}`}>
              {STATUS_LABELS[lead.status] ?? lead.status}
            </span>
            <SourceBadge lead={lead} agentNames={agentNames} />
          </div>

          <p className="text-xs text-ink-2">
            {lead.investment_min && lead.investment_max
              ? `£${lead.investment_min.toLocaleString()} – £${lead.investment_max.toLocaleString()}`
              : 'Budget not specified'}
          </p>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-line-2">
            <span className="text-xs text-ink-3">
              {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-3">
              <Link href={`/admin/leads/${lead.id}`} className="text-ff-green text-xs font-medium hover:underline">View →</Link>
              <DeleteLeadButton leadId={lead.id} />
            </div>
          </div>
        </div>
      ))}
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
        <LeadsGrid leads={activeLeads} agentNames={agentNames} />
      )}

      {/* Archived — converted & rejected */}
      {archivedLeads.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Archived ({archivedLeads.length})
          </h2>
          <LeadsGrid leads={archivedLeads} agentNames={agentNames} />
        </div>
      )}
    </div>
  )
}
