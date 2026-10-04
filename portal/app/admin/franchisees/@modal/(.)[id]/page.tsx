import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { statusBadge } from '@/components/ui/badge'
import { StageTracker } from '@/components/crm/StageTracker'
import { Section } from '@/components/crm/Section'
import { RecordTabs } from '@/components/crm/RecordTabs'
import { ThreadPanel } from '@/components/crm/ThreadPanel'
import { formatInvestmentRange, formatDate } from '@/lib/utils'
import { scoreColour } from '@/lib/matching'
import { FRANCHISEE_PIPELINE_STAGES } from '@/lib/supabase/types'
import { franchiseeStageIndex, franchiseeStage } from '@/lib/crm/pipeline'
import { MailIcon } from '@/components/icons'
import { RecordDrawerHost as DrawerHost } from '@/components/crm/RecordDrawerHost'

interface Props { params: Promise<{ id: string }> }

const gmail = (e: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e)}`

export default async function FranchiseeModal({ params }: Props) {
  const { id } = await params
  const admin = createAdminClient()

  const [{ data: fe }, { data: matches }, { data: messages }] = await Promise.all([
    admin.from('franchisee_profiles').select('*, profiles!franchisee_profiles_user_id_fkey(full_name, email)').eq('id', id).single(),
    admin.from('matches').select('id, score, match_reasons, franchisor_profiles(brand_name, category)').eq('franchisee_id', id).order('score', { ascending: false }).limit(5),
    admin.from('messages').select('id, body, from_admin, created_at').eq('thread_type', 'franchisee').eq('thread_id', id).order('created_at'),
  ])

  if (!fe) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = fe.profiles as any
  const idx = franchiseeStageIndex(fe.pipeline_stage as never)
  const budget = formatInvestmentRange(fe.investment_min, fe.investment_max)
  const who = (profile?.full_name || 'them').split(' ')[0]
  const M = messages ?? []
  const unread = M.filter(m => !m.from_admin).length

  const overview = (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-2.5">Journey</p>
        <StageTracker stages={FRANCHISEE_PIPELINE_STAGES} currentIndex={idx} />
      </div>
      <Section title={`Matched brands (${matches?.length ?? 0})`}>
        {(!matches || matches.length === 0) ? (
          <p className="text-sm text-ink-3">No matches yet.</p>
        ) : (
          <div className="space-y-2">
            {matches.map(m => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const fr = m.franchisor_profiles as any
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const reasons = ((m as any).match_reasons ?? []) as string[]
              return (
                <div key={m.id} className="rounded-xl border border-line-2 px-3.5 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={fr?.brand_name} size="md" square />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">{fr?.brand_name || 'Unnamed brand'}</p>
                      <p className="text-xs text-ink-3">{fr?.category}</p>
                    </div>
                    {m.score > 0 && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreColour(m.score)}`}>{m.score}%</span>}
                  </div>
                  {reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {reasons.map((r, i) => <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium text-ff-green bg-ff-green/10 rounded-full px-2 py-0.5">✓ {r}</span>)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
      <Section title="Qualification">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            ['Budget', budget],
            ['Liquid capital', fe.liquid_capital != null ? `£${fe.liquid_capital.toLocaleString()}` : '—'],
            ['Timeline', fe.timeline_months ? `${fe.timeline_months} months` : '—'],
            ['Locations', fe.preferred_locations?.join(', ') || '—'],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-ink-3 mb-0.5">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>
          ))}
        </dl>
      </Section>
    </div>
  )

  const activity = (
    <div className="space-y-0">
      {[
        fe.signed_at ? { t: 'Signed up', d: fe.signed_at } : null,
        matches?.length ? { t: `Matched to ${matches.length} brand${matches.length === 1 ? '' : 's'}`, d: fe.updated_at } : null,
        { t: `Stage: ${franchiseeStage(fe.pipeline_stage as never).label}`, d: fe.updated_at },
        fe.activated_at ? { t: 'Activated account', d: fe.activated_at } : null,
        { t: 'Added to the portal', d: fe.created_at },
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
    <DrawerHost expandHref={`/admin/franchisees/${id}`} ariaLabel={profile?.full_name}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar name={profile?.full_name} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-ink truncate">{profile?.full_name || 'Franchisee'}</h2>
              {statusBadge(fe.status ?? 'unknown')}
            </div>
            <p className="text-sm text-ink-2 mt-0.5 truncate">{profile?.email}</p>
          </div>
        </div>
        {profile?.email && (
          <a href={gmail(profile.email)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors flex-shrink-0">
            <MailIcon className="w-4 h-4" /> Email
          </a>
        )}
      </div>

      <RecordTabs tabs={[
        { value: 'overview', label: 'Overview', panel: overview },
        { value: 'activity', label: 'Activity', panel: activity },
        { value: 'messages', label: 'Messages', count: unread, panel: <ThreadPanel messages={M} threadType="franchisee" threadId={id} who={who} /> },
      ]} />
    </DrawerHost>
  )
}
