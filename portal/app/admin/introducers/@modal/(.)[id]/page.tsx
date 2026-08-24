import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Section } from '@/components/crm/Section'
import { RecordTabs } from '@/components/crm/RecordTabs'
import { ThreadPanel } from '@/components/crm/ThreadPanel'
import { candPill, getAgentData } from '@/app/admin/introducers/agent-metrics'
import { formatDate } from '@/lib/utils'
import { MailIcon } from '@/components/icons'
import { RecordDrawerHost as DrawerHost } from '@/components/crm/RecordDrawerHost'

interface Props { params: Promise<{ id: string }> }

const gmail = (e: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e)}`

export default async function AgentModal({ params }: Props) {
  const { id } = await params
  const admin = createAdminClient()
  const [{ agent, leads, metrics }, { data: messages }] = await Promise.all([
    getAgentData(id),
    admin.from('messages').select('id, body, from_admin, created_at').eq('thread_type', 'introducer').eq('thread_id', id).order('created_at'),
  ])
  if (!agent) notFound()

  const who = (agent.full_name || 'them').split(' ')[0]
  const M = messages ?? []
  const unread = M.filter(m => !m.from_admin).length

  const overview = (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[['Leads', metrics.total], ['Active', metrics.registered], ['Conversion', `${metrics.conv}%`], ['Commission', `£${metrics.commission.toLocaleString()}`]].map(([l, v]) => (
          <div key={l} className="bg-surface-2 rounded-xl border border-line-2 px-3 py-2.5">
            <p className="text-[18px] font-bold text-ink tabular-nums leading-none">{v}</p>
            <p className="text-[10.5px] text-ink-3 mt-1">{l}</p>
          </div>
        ))}
      </div>
      <Section title={`Referred leads (${leads.length})`}>
        {leads.length === 0 ? <p className="text-sm text-ink-3">No referrals yet.</p> : (
          <div className="space-y-2">
            {leads.map((l, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-line-2 px-3.5 py-2.5">
                <span className="text-sm font-medium text-ink">{[l.first_name, l.last_name].filter(Boolean).join(' ') || 'Lead'}</span>
                {candPill(l.status)}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )

  const activity = (
    <div className="space-y-0">
      {[
        leads.length ? { t: `Referred ${leads.length} lead${leads.length === 1 ? '' : 's'}`, d: leads[0].created_at } : null,
        { t: agent.setup_complete ? 'Account active' : 'Invite pending', d: agent.created_at },
        { t: 'Added as an agent', d: agent.created_at },
      ].filter(Boolean).map((e, i) => {
        const ev = e as { t: string; d: string }
        return (
          <div key={i} className="relative pl-5 pb-4 last:pb-0">
            <span className="absolute left-0 top-1 w-2 h-2 rounded-full bg-ff-green ring-4 ring-ff-green/10" />
            <p className="text-[13px] font-medium text-ink">{ev.t}</p>
            <p className="text-[11.5px] text-ink-3">{ev.d ? formatDate(ev.d) : '—'}</p>
          </div>
        )
      })}
    </div>
  )

  return (
    <DrawerHost expandHref={`/admin/introducers/${id}`} ariaLabel={agent.full_name ?? undefined}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar name={agent.full_name} size="lg" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink truncate">{agent.full_name || 'Agent'}</h2>
            <p className="text-sm text-ink-2 mt-0.5">Code <span className="font-mono text-ink">{agent.referral_code || '—'}</span></p>
          </div>
        </div>
        {agent.email && (
          <a href={gmail(agent.email)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors flex-shrink-0">
            <MailIcon className="w-4 h-4" /> Email
          </a>
        )}
      </div>

      <RecordTabs tabs={[
        { value: 'overview', label: 'Overview', panel: overview },
        { value: 'activity', label: 'Activity', panel: activity },
        { value: 'messages', label: 'Messages', count: unread, panel: <ThreadPanel messages={M} threadType="introducer" threadId={id} who={who} /> },
      ]} />
    </DrawerHost>
  )
}
