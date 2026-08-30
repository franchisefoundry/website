import Link from 'next/link'
import { CountUp } from '@/components/ui/CountUp'
import { Ring } from '@/components/ui/Ring'
import { StageTracker } from '@/components/crm/StageTracker'
import { Avatar } from '@/components/ui/Avatar'
import { MATCH_PIPELINE_STAGES } from '@/lib/supabase/types'
import { CheckIcon, ArrowRightIcon } from '@/components/icons'

export interface FranchiseeHomeBrand {
  brand_name: string | null
  category: string | null
  teaser: string | null
  investment_display: string | null
  timeline_months: number | null
  operator_model: string | null
}

interface Props {
  firstName: string
  profileExists: boolean
  hasPrimaryBrand: boolean
  primaryBrand: FranchiseeHomeBrand | null
  /** Index into MATCH_PIPELINE_STAGES; -1 if not started. */
  stageIndex: number
  consultantNote: string | null
  attention: { heading: string; body: string } | null
  kpis: { n: number; l: string; suffix?: string }[]
  completeness: number
}

/** Presentational franchisee home — shared by the real page and /design-preview.
 *  No brand logos anywhere: matches stay anonymous until the brand is revealed. */
export function FranchiseeHomeView({ firstName, profileExists, hasPrimaryBrand, primaryBrand, stageIndex, consultantNote, attention, kpis, completeness }: Props) {
  const stage = stageIndex >= 0 ? MATCH_PIPELINE_STAGES[stageIndex] : null
  const nextStage = stageIndex >= 0 && stageIndex < MATCH_PIPELINE_STAGES.length - 1 ? MATCH_PIPELINE_STAGES[stageIndex + 1] : null
  const heroLine = attention?.heading
    ?? (hasPrimaryBrand ? "Here's where you are on your journey." : "We're finding the right franchise for you.")

  return (
    <div className="max-w-5xl">
      {/* Hero */}
      <div className="rise relative overflow-hidden rounded-2xl p-6 text-white shadow-[0_18px_40px_rgba(27,33,26,0.22)] bg-gradient-to-br from-ff-green to-ff-green-deep">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(560px 220px at 88% -30%, rgba(200,146,74,0.34), transparent 60%)' }} />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {firstName}</h1>
          <p className="text-sm text-white/70 mt-1.5 max-w-xl">{heroLine}</p>
          <Link href="/franchisee/matches"
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ff-green-deep shadow-[0_6px_18px_rgba(200,146,74,0.4)] bg-gradient-to-br from-ff-gold to-[#dcae6b] hover:-translate-y-0.5 transition-transform">
            {hasPrimaryBrand ? 'View your journey' : 'See your matches'} <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Journey stepper */}
      {hasPrimaryBrand && stageIndex >= 0 && (
        <div className="rise bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-5 mt-4" style={{ animationDelay: '0.06s' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-3">Your journey</p>
          <StageTracker stages={MATCH_PIPELINE_STAGES} currentIndex={stageIndex} />
          {stage && (
            <p className="text-sm text-ink-2 mt-3">
              You&apos;re at <span className="font-semibold text-ink">{stage.label}</span>
              {nextStage && <span className="text-ink-3"> — next: {nextStage.label}</span>}.
            </p>
          )}
        </div>
      )}

      {/* Attention banner */}
      {attention && (
        <div className="rise mt-4 bg-ff-gold-soft border border-[#e6cfa6] rounded-2xl px-5 py-4 flex items-start justify-between gap-4" style={{ animationDelay: '0.1s' }}>
          <div>
            <p className="text-sm font-semibold text-ff-gold-ink">{attention.heading}</p>
            <p className="text-xs text-ff-gold-ink/80 mt-0.5 leading-relaxed max-w-xl">{attention.body}</p>
          </div>
          <Link href="/franchisee/matches" className="shrink-0 text-ff-gold-ink text-xs font-semibold hover:underline whitespace-nowrap">View →</Link>
        </div>
      )}

      {/* KPI strip */}
      {profileExists && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {kpis.map((k, i) => (
            <Link key={k.l} href="/franchisee/matches"
              className="lift rise bg-surface border border-line rounded-2xl px-4 py-4 shadow-[0_1px_2px_rgba(27,33,26,0.05)]"
              style={{ animationDelay: `${0.12 + i * 0.06}s` }}>
              <p className="text-[28px] font-extrabold tracking-tight text-ink tabular-nums leading-none"><CountUp value={k.n} suffix={k.suffix ?? ''} /></p>
              <p className="text-[11px] text-ink-3 mt-1.5">{k.l}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Primary brand OR getting-started */}
      <div className="mt-4">
        {hasPrimaryBrand && primaryBrand ? (
          <div className="rise bg-surface border border-line rounded-2xl shadow-[0_14px_34px_rgba(27,33,26,0.08)] overflow-hidden" style={{ animationDelay: '0.34s' }}>
            <div className="h-1 bg-gradient-to-r from-ff-gold to-[#e8c9a0]" />
            <div className="p-5">
              <div className="flex items-start gap-4">
                <Avatar name={primaryBrand.brand_name} size="lg" square />
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[11px] font-bold text-ff-green bg-ff-green/10 rounded-full px-2.5 py-1 mb-2">Your matched brand</span>
                  <p className="text-base font-bold text-ink">{primaryBrand.brand_name ?? 'Confidential brand'}</p>
                  <p className="text-xs text-ink-3 mb-2">{primaryBrand.category ?? '—'}</p>
                  {primaryBrand.teaser && <p className="text-sm text-ink-2 leading-relaxed line-clamp-2 mb-3">{primaryBrand.teaser}</p>}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    {primaryBrand.investment_display && (
                      <div><p className="text-ink-3 mb-0.5">Investment</p><p className="font-semibold text-ink tabular-nums">{primaryBrand.investment_display}</p></div>
                    )}
                    {primaryBrand.timeline_months && (
                      <div><p className="text-ink-3 mb-0.5">Setup</p><p className="font-semibold text-ink">{primaryBrand.timeline_months} months</p></div>
                    )}
                    {primaryBrand.operator_model && (
                      <div><p className="text-ink-3 mb-0.5">Model</p><p className="font-semibold text-ink capitalize">{primaryBrand.operator_model.replace('-', ' ')}</p></div>
                    )}
                  </div>
                </div>
              </div>
              {consultantNote && (
                <div className="mt-4 bg-surface-2 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-ink-3 uppercase tracking-wide mb-1">Note from your consultant</p>
                  <p className="text-xs text-ink-2 leading-relaxed">{consultantNote}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rise grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-5" style={{ animationDelay: '0.34s' }}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-3">Getting started</p>
              <ol className="space-y-3">
                {[
                  { label: 'Account created', done: true, desc: "You're in — welcome to Franchise Foundry." },
                  { label: 'Complete your profile', done: completeness === 100, desc: completeness === 100 ? 'Profile complete — great work.' : `${completeness}% done — a full profile finds stronger matches.`, href: '/franchisee/profile' },
                  { label: 'First match revealed', done: false, desc: 'Your consultant is reviewing your profile to find the best fit.' },
                ].map((s, i, arr) => (
                  <li key={s.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${s.done ? 'bg-ff-green border-ff-green' : 'bg-surface border-line'}`}>
                        {s.done ? <CheckIcon className="w-3 h-3 text-white" /> : <span className="text-[10px] font-bold text-ink-3">{i + 1}</span>}
                      </span>
                      {i < arr.length - 1 && <span className="w-0.5 flex-1 min-h-[1.5rem] bg-line-2 my-1" />}
                    </div>
                    <div className="pb-1">
                      <p className={`text-sm font-semibold ${s.done ? 'text-ink' : 'text-ink-2'}`}>{s.label}</p>
                      <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">{s.desc}</p>
                      {s.href && completeness < 100 && <Link href={s.href} className="mt-1.5 inline-block text-xs font-semibold text-ff-green hover:underline">Complete profile →</Link>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex sm:flex-col items-center gap-2 sm:pl-5 sm:border-l border-line-2">
              <Ring pct={completeness} size={84} />
              <p className="text-xs text-ink-3 text-center max-w-[9rem]">Profile strength</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
