import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { statusBadge } from '@/components/ui/badge'
import { StageTracker } from '@/components/crm/StageTracker'
import { formatInvestmentRange } from '@/lib/utils'
import { scoreColour, scoreLabel } from '@/lib/matching'
import { MailIcon } from '@/components/icons'
import { Section } from '@/components/crm/Section'
import FranchiseeActions from './actions'
import MeetingNotes from './MeetingNotes'
import DocumentsPanel from './DocumentsPanel'
import { FRANCHISEE_PIPELINE_STAGES, MATCH_PIPELINE_STAGES } from '@/lib/supabase/types'
import { franchiseeStageIndex } from '@/lib/crm/pipeline'
import { ImpersonateButton } from '@/components/admin/ImpersonateButton'
import { ArchiveButton } from '@/components/admin/ArchiveButton'

interface Props { params: Promise<{ id: string }> }

const gmail = (e: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e)}`

export default async function FranchiseeDetailPage({ params }: Props) {
  const { id } = await params
  const admin = createAdminClient()
  await createClient()

  const [{ data: franchisee }, { data: franchisors }, { data: matches }, { data: documents }] = await Promise.all([
    admin.from('franchisee_profiles')
      .select('*, profiles!franchisee_profiles_user_id_fkey(full_name, email, phone)')
      .eq('id', id).single(),
    admin.from('franchisor_profiles').select('id, brand_name, category').in('status', ['active', 'pending_review']).order('brand_name'),
    admin.from('matches').select('*, franchisor_profiles(id, brand_name, category, status)').eq('franchisee_id', id).order('score', { ascending: false }),
    admin.from('franchisee_documents').select('*').eq('franchisee_profile_id', id).order('created_at', { ascending: false }),
  ])

  if (!franchisee) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = franchisee.profiles as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = franchisee as any

  const find = (fid: string | null) => (fid ? (franchisors ?? []).find(x => x.id === fid) ?? null : null)
  const assignedFranchisor = find(franchisee.assigned_franchisor_id)
  const backupFranchisor1 = find(f.backup_franchisor_1_id)
  const backupFranchisor2 = find(f.backup_franchisor_2_id)

  const stageIndex = franchiseeStageIndex(franchisee.pipeline_stage as never)
  const budget = formatInvestmentRange(franchisee.investment_min, franchisee.investment_max)

  return (
    <div className="max-w-6xl">
      <Link href="/admin/franchisees" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-4">
        ‹ Back to franchisees
      </Link>

      {/* Hero */}
      <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.04)] p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={profile?.full_name} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-ink">{profile?.full_name || 'Franchisee'}</h1>
                {statusBadge(franchisee.status ?? 'unknown')}
              </div>
              <p className="text-sm text-ink-2 mt-0.5">
                {[profile?.email, budget !== 'Not specified' ? budget : null].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {profile?.email && (
              <a href={gmail(profile.email)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors">
                <MailIcon className="w-4 h-4" /> Email
              </a>
            )}
            <ImpersonateButton
              userId={franchisee.user_id}
              redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/franchisee/dashboard`}
              label="View as franchisee →"
            />
            <ArchiveButton type="franchisees" id={id} name={profile?.full_name || 'this franchisee'} redirectTo="/admin/franchisees" />
          </div>
        </div>

        {/* Journey */}
        <div className="mt-5 pt-4 border-t border-line-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-2.5">Journey</p>
          <StageTracker stages={FRANCHISEE_PIPELINE_STAGES} currentIndex={stageIndex} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left */}
        <div className="lg:col-span-2 space-y-5">
          {/* Matched brands */}
          <Section title={`Matched brands (${matches?.length ?? 0})`}>
            {(!matches || matches.length === 0) ? (
              <p className="text-sm text-ink-3">No matches yet. Run matching to generate scores.</p>
            ) : (
              <div className="space-y-2.5">
                {matches.map(m => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const fr = m.franchisor_profiles as any
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const ps = MATCH_PIPELINE_STAGES.find(s => s.value === (m as any).pipeline_stage)
                  const isAssigned = fr?.id === franchisee.assigned_franchisor_id
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const reasons = ((m as any).match_reasons ?? []) as string[]
                  return (
                    <div key={m.id} className={`rounded-xl border px-4 py-3 ${isAssigned ? 'border-ff-green/40 bg-ff-green/[0.04]' : 'border-line-2'}`}>
                      <div className="flex items-center gap-3">
                        <Avatar name={fr?.brand_name} size="md" square />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-ink truncate">{fr?.brand_name || 'Unnamed brand'}</p>
                            {isAssigned && <span className="text-[10px] font-bold text-ff-green bg-ff-green/10 rounded-full px-2 py-0.5">Assigned</span>}
                          </div>
                          <p className="text-xs text-ink-3">{fr?.category}</p>
                        </div>
                        {ps && <span className="text-xs text-ink-2 hidden sm:flex items-center gap-1">{ps.emoji} {ps.label}</span>}
                        {m.score > 0 && (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreColour(m.score)}`}>
                            {m.score}% — {scoreLabel(m.score)}
                          </span>
                        )}
                        {statusBadge(m.status)}
                      </div>
                      {reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {reasons.map((r, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium text-ff-green bg-ff-green/10 rounded-full px-2 py-0.5">✓ {r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Qualification */}
          <Section title="Qualification" right={<span className="text-xs text-ink-3">from matching quiz</span>}>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ['Investment budget', budget],
                ['Liquid capital', franchisee.liquid_capital != null ? `£${franchisee.liquid_capital.toLocaleString()}` : '—'],
                ['Preferred locations', franchisee.preferred_locations?.join(', ') || '—'],
                ['Operator model', franchisee.operator_model?.replace('-', ' ') || '—'],
                ['Experience', franchisee.experience?.replace('-', ' ') || '—'],
                ['Full-time available', franchisee.full_time_available == null ? '—' : franchisee.full_time_available ? 'Yes' : 'No'],
                ['Multi-site interest', franchisee.multi_site_interest ? 'Yes' : 'No'],
                ['Timeline', franchisee.timeline_months ? `${franchisee.timeline_months} months` : '—'],
                ['Sectors', franchisee.sectors?.join(', ') || '—'],
                ['Format preferences', franchisee.format_types?.join(', ') || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-ink-3 mb-0.5">{k}</dt>
                  <dd className="font-medium text-ink capitalize">{v}</dd>
                </div>
              ))}
              {franchisee.goals && (
                <div className="sm:col-span-2">
                  <dt className="text-ink-3 mb-0.5">Goals</dt>
                  <dd className="font-medium text-ink">{franchisee.goals}</dd>
                </div>
              )}
            </dl>
          </Section>

          {/* Documents */}
          <Section title="Documents">
            <DocumentsPanel
              franchiseeId={id}
              initialDocs={(documents ?? []) as {
                id: string; name: string; file_path: string; file_size: number | null
                mime_type: string | null; shared_with_franchisor: boolean; created_at: string
              }[]}
            />
          </Section>

          {/* Meeting notes */}
          <Section title="Meeting notes">
            <MeetingNotes franchiseeId={id} initialNotes={franchisee.meeting_notes ?? null} initialRating={franchisee.internal_rating ?? null} />
          </Section>
        </div>

        {/* Right — assignment actions */}
        <div>
          <FranchiseeActions
            franchisee={franchisee}
            franchisors={franchisors ?? []}
            assignedFranchisor={assignedFranchisor}
            backupFranchisor1={backupFranchisor1}
            backupFranchisor2={backupFranchisor2}
          />
        </div>
      </div>
    </div>
  )
}
