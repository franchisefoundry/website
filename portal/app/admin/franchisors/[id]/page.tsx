import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Section } from '@/components/crm/Section'
import { statusBadge } from '@/components/ui/badge'
import { formatInvestmentRange } from '@/lib/utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { MailIcon } from '@/components/icons'
import FranchisorStatusActions from './actions'
import MatchPipelineSelect from '@/app/admin/matches/match-pipeline-select'
import MatchStatusSelect from '@/app/admin/matches/match-status-select'
import RevealToggle from '@/app/admin/matches/reveal-toggle'
import Link from 'next/link'
import { MATCH_PIPELINE_STAGES } from '@/lib/supabase/types'
import { FranchisorPreviewButton } from '@/components/admin/FranchisorPreviewButton'
import { ArchiveButton } from '@/components/admin/ArchiveButton'
import { BrandTerritories } from './BrandTerritories'
import SendAgreementButton from './SendAgreementButton'
import { AgreementSection } from '@/components/admin/AgreementSection'

interface Props {
  params: Promise<{ id: string }>
}

const gmail = (e: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e)}`

export default async function FranchisorDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: franchisor } = await supabase
    .from('franchisor_profiles')
    .select('*, profiles(full_name, email)')
    .eq('id', id)
    .single()

  if (!franchisor) notFound()

  const admin = createAdminClient()
  const [{ data: questionnaire }, { data: matches }, { data: franchisorAgreement }] = await Promise.all([
    admin.from('franchisor_questionnaires').select('completed_at').eq('franchisor_id', id).single(),
    admin
      .from('matches')
      .select('id, status, pipeline_stage, score, franchisor_revealed, franchisee_profiles(id, profiles!franchisee_profiles_user_id_fkey(full_name, role))')
      .eq('franchisor_id', id)
      .order('created_at', { ascending: false }),
    admin
      .from('franchisor_agreements')
      .select('id, status, sent_at, signed_at, signer_name, signed_pdf_path')
      .eq('franchisor_profile_id', id)
      .maybeSingle(),
  ])

  // Agreement comments (the brand's queries raised on the agreement)
  let agreementComments: { id: string; body: string; section_ref: string | null; created_at: string; author_name: string }[] = []
  if (franchisorAgreement?.id) {
    const { data: rawComments } = await admin
      .from('agreement_comments')
      .select('id, body, section_ref, created_at, author_id')
      .eq('franchisor_agreement_id', franchisorAgreement.id)
      .order('created_at', { ascending: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authorIds = [...new Set((rawComments ?? []).map((c: any) => c.author_id).filter(Boolean))] as string[]
    const { data: authors } = authorIds.length ? await admin.from('profiles').select('id, full_name').in('id', authorIds) : { data: [] }
    const nameMap = Object.fromEntries((authors ?? []).map(a => [a.id, a.full_name ?? 'Unknown']))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agreementComments = (rawComments ?? []).map((c: any) => ({ id: c.id, body: c.body, section_ref: c.section_ref, created_at: c.created_at, author_name: nameMap[c.author_id] ?? 'Brand' }))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = franchisor.profiles as any

  const candidateMatches = (matches ?? []).filter(m => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (m as any).franchisee_profiles?.profiles?.role === 'franchisee'
  })

  return (
    <div className="max-w-6xl">
      <Link href="/admin/franchisors" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-4">
        ‹ Back to brands
      </Link>

      {/* Hero */}
      <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.04)] p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={franchisor.brand_name} size="lg" square />
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-ink">{franchisor.brand_name || 'Incomplete profile'}</h1>
                {statusBadge(franchisor.status)}
              </div>
              <p className="text-sm text-ink-2 mt-0.5">
                {[franchisor.category, profile?.email].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <SendAgreementButton franchisorProfileId={id} currentStatus={franchisorAgreement?.status ?? null} />
            <FranchisorPreviewButton franchisorId={id} />
            {profile?.email && (
              <a href={gmail(profile.email)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors">
                <MailIcon className="w-4 h-4" /> Email
              </a>
            )}
            <Link href={`/admin/franchisors/${id}/edit`}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-sm font-medium bg-ff-green text-white shadow-sm hover:brightness-110 transition-all">
              Edit profile
            </Link>
            <ArchiveButton type="franchisors" id={id} name={franchisor.brand_name || 'this brand'} redirectTo="/admin/franchisors" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Snapshot */}
          <Section title="Brand profile">
            {franchisor.teaser && <p className="text-sm text-ink-2 mb-5 italic">&ldquo;{franchisor.teaser}&rdquo;</p>}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ['Category', franchisor.category || '—'],
                ['Investment range', formatInvestmentRange(franchisor.investment_min, franchisor.investment_max)],
                ['Franchise fee', franchisor.franchise_fee ? `£${franchisor.franchise_fee.toLocaleString()}` : '—'],
                ['Locations', franchisor.locations_display || franchisor.locations_available?.join(', ') || '—'],
                ['Timeline', franchisor.timeline_months ? `${franchisor.timeline_months} months` : '—'],
                ['Operator model', franchisor.operator_model?.replace('-', ' ') || '—'],
                ['Experience required', franchisor.experience_required?.replace('-', ' ') || '—'],
                ['Multi-site ready', franchisor.multi_site_ready ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-ink-3 mb-0.5">{k}</dt>
                  <dd className="font-medium text-ink capitalize">{v}</dd>
                </div>
              ))}
            </dl>
            {franchisor.highlights?.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-ink mb-2">Highlights</p>
                <ul className="space-y-1">
                  {franchisor.highlights.map((h: string, i: number) => (
                    <li key={i} className="text-sm text-ink-2 flex gap-2"><span className="text-ff-gold mt-0.5">•</span>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {/* Candidates */}
          {candidateMatches.length > 0 && (
            <Section title={`Candidates (${candidateMatches.length})`}>
              <div className="space-y-3">
                {candidateMatches.map(m => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const fe = (m as any).franchisee_profiles as any
                  const name = fe?.profiles?.full_name || 'Unknown'
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const stage = MATCH_PIPELINE_STAGES.find(s => s.value === (m as any).pipeline_stage)
                  return (
                    <div key={m.id} className="rounded-xl border border-line-2 px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Link href={`/admin/franchisees/${fe?.id}`} className="text-sm font-semibold text-ink hover:text-ff-green transition-colors">{name}</Link>
                        <div className="flex items-center gap-2">
                          {stage && <span className="text-xs text-ink-2 hidden sm:flex items-center gap-1">{stage.emoji} {stage.label}</span>}
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <RevealToggle matchId={m.id} revealed={(m as any).franchisor_revealed ?? false} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-1">Franchisor status</p>
                          <MatchStatusSelect matchId={m.id} currentStatus={m.status} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-1">Pipeline stage</p>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <MatchPipelineSelect matchId={m.id} currentStage={(m as any).pipeline_stage ?? null} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Agreement */}
          <AgreementSection agreement={franchisorAgreement} comments={agreementComments} />

          {/* Questionnaire */}
          <Section title="Onboarding questionnaire" right={
            <Link href={`/admin/franchisors/${id}/questionnaire`} className="text-sm font-medium text-ff-green hover:underline">
              {questionnaire ? 'View / edit →' : 'Add answers →'}
            </Link>
          }>
            <p className="text-sm text-ink-2">
              {questionnaire?.completed_at
                ? `Submitted ${new Date(questionnaire.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'Not yet submitted'}
            </p>
          </Section>

          {/* Territories */}
          <Section title="Territories">
            <BrandTerritories franchisorId={id} />
          </Section>
        </div>

        <div>
          <FranchisorStatusActions franchisor={franchisor} linkedUser={profile ?? null} />
        </div>
      </div>
    </div>
  )
}
