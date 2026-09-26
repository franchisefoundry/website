import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import InviteAgentButton from './InviteIntroducerButton'
import AgentsTable from './AgentsTable'
import { ensureReferralCode } from '@/lib/referral'
import { AgentIcon } from '@/components/icons'
import { Avatar } from '@/components/ui/Avatar'
import ViewToggle, { currentView } from '@/components/admin/ViewToggle'
import { KanbanBoard } from '@/components/admin/KanbanBoard'
import { ListTable, type ListColumn } from '@/components/admin/ListTable'

const AGENT_TIERS = [
  { key: 'none', label: 'No leads yet', dot: 'var(--ff-ink-3)' },
  { key: 'pending', label: 'Awaiting activity', dot: 'var(--ff-gold)' },
  { key: 'active', label: 'Active pipeline', dot: 'var(--ff-green)' },
]

export default async function AdminIntroducersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const current = currentView((await searchParams).view)
  const admin = createAdminClient()

  const { data: introducers } = await admin
    .from('profiles')
    .select('id, full_name, email, phone, referral_code, created_at')
    .eq('role', 'introducer')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  // Ensure every agent has a referral code so the admin can share it immediately
  await Promise.all(
    (introducers ?? [])
      .filter(a => !a.referral_code)
      .map(async a => {
        a.referral_code = await ensureReferralCode(admin, a.id)
      }),
  )

  // Get lead counts per agent
  const { data: leadCounts } = await admin
    .from('introducer_leads')
    .select('introducer_id, status')

  const countsByAgent: Record<string, { total: number; pending: number; active: number }> = {}
  ;(leadCounts ?? []).forEach(l => {
    if (!countsByAgent[l.introducer_id]) {
      countsByAgent[l.introducer_id] = { total: 0, pending: 0, active: 0 }
    }
    countsByAgent[l.introducer_id].total++
    if (l.status === 'submitted') countsByAgent[l.introducer_id].pending++
    if (['invited', 'registered', 'matched', 'intro_made'].includes(l.status)) countsByAgent[l.introducer_id].active++
  })

  const agentRows = (introducers ?? []).map(a => ({
    id: a.id, full_name: a.full_name, email: a.email, referral_code: a.referral_code,
    ...(countsByAgent[a.id] ?? { total: 0, pending: 0, active: 0 }),
  }))
  type AgentRow = typeof agentRows[number]
  const tierOf = (a: AgentRow) => a.total === 0 ? 'none' : a.active > 0 ? 'active' : 'pending'

  const listColumns: ListColumn<AgentRow>[] = [
    { header: 'Agent', cell: a => (
      <div className="flex items-center gap-2.5"><Avatar name={a.full_name} size="sm" /><div className="min-w-0"><p className="font-medium text-ink truncate">{a.full_name ?? '—'}</p><p className="text-xs text-ink-3 truncate">{a.email ?? '—'}</p></div></div>
    ) },
    { header: 'Code', cell: a => <span className="font-mono text-xs text-ink-2">{a.referral_code ?? '—'}</span>, className: 'hidden md:table-cell' },
    { header: 'Leads', cell: a => <span className="tabular-nums text-ink-2">{a.total}</span> },
    { header: 'Active', cell: a => <span className="tabular-nums text-ink-2">{a.active}</span>, className: 'hidden sm:table-cell' },
    { header: 'Not invited', cell: a => <span className="tabular-nums text-ink-2">{a.pending}</span>, className: 'hidden sm:table-cell' },
  ]

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Manage agent accounts and their pipeline."
        action={<div className="flex flex-wrap items-center gap-2"><ViewToggle current={current} basePath="/admin/introducers" /><InviteAgentButton /></div>}
      />

      {(introducers ?? []).length === 0 ? (
        <div className="bg-surface rounded-2xl border border-line p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-ff-green/10 text-ff-green flex items-center justify-center mx-auto mb-4"><AgentIcon className="w-6 h-6" /></div>
          <p className="text-ink font-semibold text-sm mb-1">No agents yet</p>
          <p className="text-ink-3 text-xs">Use the button above to invite your first agent.</p>
        </div>
      ) : current === 'cards' ? (
        <AgentsTable agents={introducers ?? []} countsByAgent={countsByAgent} />
      ) : current === 'kanban' ? (
        <KanbanBoard
          columns={AGENT_TIERS}
          items={agentRows}
          groupBy={tierOf}
          hrefFor={a => `/admin/introducers/${a.id}`}
          renderCard={a => (
            <>
              <div className="flex items-center gap-2">
                <Avatar name={a.full_name} size="sm" />
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-ink truncate">{a.full_name ?? '—'}</p><p className="text-[11px] text-ink-3 truncate font-mono">{a.referral_code ?? '—'}</p></div>
              </div>
              <div className="flex gap-3 mt-2 text-[11px] text-ink-3 tabular-nums"><span>{a.total} leads</span><span>{a.active} active</span></div>
            </>
          )}
        />
      ) : (
        <ListTable columns={listColumns} rows={agentRows} hrefFor={a => `/admin/introducers/${a.id}`} />
      )}
    </div>
  )
}
