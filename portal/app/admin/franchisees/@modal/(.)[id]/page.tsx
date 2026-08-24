import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { statusBadge } from '@/components/ui/badge'
import { StageTracker } from '@/components/crm/StageTracker'
import { Section } from '@/components/crm/Section'
import { formatInvestmentRange } from '@/lib/utils'
import { scoreColour } from '@/lib/matching'
import { FRANCHISEE_PIPELINE_STAGES } from '@/lib/supabase/types'
import { franchiseeStageIndex } from '@/lib/crm/pipeline'
import { MailIcon } from '@/components/icons'
import { RecordDrawerHost as DrawerHost } from '@/components/crm/RecordDrawerHost'

interface Props { params: Promise<{ id: string }> }

const gmail = (e: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e)}`

export default async function FranchiseeModal({ params }: Props) {
  const { id } = await params
  const admin = createAdminClient()

  const [{ data: fe }, { data: matches }] = await Promise.all([
    admin.from('franchisee_profiles')
      .select('*, profiles!franchisee_profiles_user_id_fkey(full_name, email)')
      .eq('id', id).single(),
    admin.from('matches')
      .select('id, score, franchisor_profiles(brand_name, category)')
      .eq('franchisee_id', id).order('score', { ascending: false }).limit(5),
  ])

  if (!fe) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = fe.profiles as any
  const idx = franchiseeStageIndex(fe.pipeline_stage as never)
  const budget = formatInvestmentRange(fe.investment_min, fe.investment_max)

  return (
    <DrawerHost expandHref={`/admin/franchisees/${id}`} ariaLabel={profile?.full_name}>
      {/* Header */}
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

      {/* Journey */}
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-2.5">Journey</p>
        <StageTracker stages={FRANCHISEE_PIPELINE_STAGES} currentIndex={idx} />
      </div>

      <div className="space-y-4">
        <Section title={`Matched brands (${matches?.length ?? 0})`}>
          {(!matches || matches.length === 0) ? (
            <p className="text-sm text-ink-3">No matches yet.</p>
          ) : (
            <div className="space-y-2">
              {matches.map(m => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fr = m.franchisor_profiles as any
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line-2 px-3.5 py-2.5">
                    <Avatar name={fr?.brand_name} size="md" square />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">{fr?.brand_name || 'Unnamed brand'}</p>
                      <p className="text-xs text-ink-3">{fr?.category}</p>
                    </div>
                    {m.score > 0 && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreColour(m.score)}`}>{m.score}%</span>
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
              <div key={k}>
                <dt className="text-ink-3 mb-0.5">{k}</dt>
                <dd className="font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </DrawerHost>
  )
}
