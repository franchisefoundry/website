import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Avatar } from '@/components/ui/Avatar'
import Link from 'next/link'
import type { Lead } from '@/lib/supabase/types'
import DeleteLeadButton from './DeleteLeadButton'
import ViewToggle, { currentView } from '@/components/admin/ViewToggle'
import { KanbanBoard } from '@/components/admin/KanbanBoard'
import { ListTable, type ListColumn } from '@/components/admin/ListTable'

const LEAD_COLUMNS = [
  { key: 'new', label: 'New', dot: '#2563eb' },
  { key: 'meeting_requested', label: 'Meeting booked', dot: 'var(--ff-gold)' },
  { key: 'converted', label: 'Approved', dot: 'var(--ff-green)' },
  { key: 'rejected', label: 'Rejected', dot: 'var(--ff-ink-3)' },
]

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  meeting_requested: 'bg-amber-50 text-amber-700',
  converted: 'bg-ff-green-soft text-ff-green',
  rejected: 'bg-surface-2 text-ink-3',
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
  return <span className="text-xs text-ink-3">Matching platform</span>
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
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[lead.status] ?? 'bg-surface-2 text-ink-3'}`}>
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

export default async function AdminLeadsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const current = currentView((await searchParams).view)
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

  // Cards default to the active working set (New + Meeting booked); List and
  // Kanban show every lead, with Approved/Rejected in their own place.
  const activeLeads = typedLeads.filter(l => l.status === 'new' || l.status === 'meeting_requested')

  const budget = (l: Lead) => l.investment_min && l.investment_max ? `£${l.investment_min.toLocaleString()} – £${l.investment_max.toLocaleString()}` : '—'
  const listColumns: ListColumn<Lead>[] = [
    { header: 'Lead', cell: l => (
      <div className="flex items-center gap-2.5"><Avatar name={l.full_name} size="sm" /><div className="min-w-0"><p className="font-medium text-ink truncate">{l.full_name}</p><p className="text-xs text-ink-3 truncate">{l.email}</p></div></div>
    ) },
    { header: 'Source', cell: l => <SourceBadge lead={l} agentNames={agentNames} />, className: 'hidden md:table-cell' },
    { header: 'Budget', cell: l => <span className="text-ink-2 tabular-nums whitespace-nowrap">{budget(l)}</span>, className: 'hidden sm:table-cell' },
    { header: 'Status', cell: l => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[l.status] ?? 'bg-surface-2 text-ink-3'}`}>{STATUS_LABELS[l.status] ?? l.status}</span> },
    { header: 'Added', cell: l => <span className="text-ink-3 whitespace-nowrap">{new Date(l.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>, className: 'hidden lg:table-cell' },
  ]

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Quiz submissions from the public matching form."
        action={<ViewToggle current={current} basePath="/admin/leads" />}
      />

      {typedLeads.length === 0 ? (
        <div className="text-center py-16 text-ink-3 text-sm">No leads yet. Share the <strong className="text-ink-2">/get-matched</strong> link to start collecting.</div>
      ) : current === 'cards' ? (
        activeLeads.length === 0
          ? <div className="text-center py-16 text-ink-3 text-sm">No active leads. Switch to Kanban or Table to see approved and rejected leads.</div>
          : <LeadsGrid leads={activeLeads} agentNames={agentNames} />
      ) : current === 'kanban' ? (
        <KanbanBoard
          columns={LEAD_COLUMNS}
          items={typedLeads}
          groupBy={l => l.status}
          hrefFor={l => `/admin/leads/${l.id}`}
          renderCard={l => (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink truncate">{l.full_name}</span>
              </div>
              <p className="text-[11px] text-ink-3 mt-1 tabular-nums">{budget(l)}</p>
              <div className="mt-1.5"><SourceBadge lead={l} agentNames={agentNames} /></div>
            </>
          )}
        />
      ) : (
        <ListTable columns={listColumns} rows={typedLeads} hrefFor={l => `/admin/leads/${l.id}`} />
      )}
    </div>
  )
}
