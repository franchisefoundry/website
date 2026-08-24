import { notFound } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Section } from '@/components/crm/Section'
import { candPill, getAgentData } from '@/app/admin/introducers/agent-metrics'
import Link from 'next/link'
import { MailIcon, MessageIcon } from '@/components/icons'
import { RecordDrawerHost as DrawerHost } from '@/components/crm/RecordDrawerHost'

interface Props { params: Promise<{ id: string }> }

const gmail = (e: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e)}`

export default async function AgentModal({ params }: Props) {
  const { id } = await params
  const { agent, leads, metrics } = await getAgentData(id)
  if (!agent) notFound()

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
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/admin/messages?thread=introducer:${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors">
            <MessageIcon className="w-4 h-4" /> Message
          </Link>
          {agent.email && (
            <a href={gmail(agent.email)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors">
              <MailIcon className="w-4 h-4" /> Email
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[['Leads', metrics.total], ['Active', metrics.registered], ['Conversion', `${metrics.conv}%`], ['Commission', `£${metrics.commission.toLocaleString()}`]].map(([l, v]) => (
          <div key={l} className="bg-surface-2 rounded-xl border border-line-2 px-3 py-2.5">
            <p className="text-[18px] font-bold text-ink tabular-nums leading-none">{v}</p>
            <p className="text-[10.5px] text-ink-3 mt-1">{l}</p>
          </div>
        ))}
      </div>

      <Section title={`Referred leads (${leads.length})`}>
        {leads.length === 0 ? (
          <p className="text-sm text-ink-3">No referrals yet.</p>
        ) : (
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
    </DrawerHost>
  )
}
