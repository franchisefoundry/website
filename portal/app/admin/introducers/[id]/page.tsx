import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Section } from '@/components/crm/Section'
import { candPill, getAgentData } from '@/app/admin/introducers/agent-metrics'
import { MailIcon } from '@/components/icons'

interface Props { params: Promise<{ id: string }> }

const gmail = (e: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e)}`

export default async function AgentDetailPage({ params }: Props) {
  const { id } = await params
  const { agent, leads, metrics } = await getAgentData(id)
  if (!agent) notFound()

  return (
    <div className="max-w-4xl">
      <Link href="/admin/introducers" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-4">‹ Back to agents</Link>

      <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.04)] p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={agent.full_name} size="lg" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-ink">{agent.full_name || 'Agent'}</h1>
              <p className="text-sm text-ink-2 mt-0.5">Code <span className="font-mono text-ink">{agent.referral_code || '—'}</span></p>
            </div>
          </div>
          {agent.email && (
            <a href={gmail(agent.email)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors">
              <MailIcon className="w-4 h-4" /> Email
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-line-2">
          {[['Leads', metrics.total], ['Active', metrics.registered], ['Conversion', `${metrics.conv}%`], ['Commission', `£${metrics.commission.toLocaleString()}`]].map(([l, v]) => (
            <div key={l}>
              <p className="text-[22px] font-bold text-ink tabular-nums leading-none">{v}</p>
              <p className="text-[11px] text-ink-3 mt-1">{l}</p>
            </div>
          ))}
        </div>
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
    </div>
  )
}
