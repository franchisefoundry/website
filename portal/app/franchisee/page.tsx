import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { MATCH_PIPELINE_STAGES } from '@/lib/supabase/types'
import { formatInvestmentRange } from '@/lib/utils'
import Link from 'next/link'

export default async function FranchiseeDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: franchiseeProfile }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('franchisee_profiles')
      .select('id, assigned_franchisor_id, backup_franchisor_1_id, backup_franchisor_2_id')
      .eq('user_id', user!.id)
      .single(),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const profileId = franchiseeProfile?.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fp = franchiseeProfile as any
  const hasPrimaryBrand = !!fp?.assigned_franchisor_id

  // Use admin client so we can access franchisor profile data and role-filter
  const admin = createAdminClient()

  // Fetch all their matches (for stats)
  const { data: allMatches } = profileId
    ? await admin
        .from('matches')
        .select('id, status, score')
        .eq('franchisee_id', profileId)
        .not('status', 'eq', 'declined')
    : { data: [] }

  const totalMatches   = (allMatches ?? []).length
  const interestedCount = (allMatches ?? []).filter(m => m.status === 'interested').length
  const introCount     = (allMatches ?? []).filter(m => m.status === 'intro_made').length

  // Fetch primary brand match for the hero card
  const { data: primaryMatch } = hasPrimaryBrand && profileId
    ? await admin
        .from('matches')
        .select(`
          id, pipeline_stage, franchisor_notes,
          franchisor_profiles(
            id, brand_name, category, teaser, logo_url,
            investment_min, investment_max, investment_display,
            timeline_months, operator_model, experience_required
          )
        `)
        .eq('franchisee_id', profileId)
        .eq('franchisor_id', fp.assigned_franchisor_id)
        .maybeSingle()
    : { data: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primaryBrand = (primaryMatch?.franchisor_profiles as any) ?? null

  const currentStageIdx = MATCH_PIPELINE_STAGES.findIndex(s => s.value === primaryMatch?.pipeline_stage)
  const currentStage    = currentStageIdx >= 0 ? MATCH_PIPELINE_STAGES[currentStageIdx] : null

  // Profile completeness (franchisee)
  const pf = franchiseeProfile as Record<string, unknown> | null
  const profileFields = ['investment_min', 'investment_max', 'liquid_capital', 'preferred_locations', 'operator_model', 'timeline_months', 'goals']
  const filledFields  = profileFields.filter(f => pf?.[f] !== null && pf?.[f] !== undefined && pf?.[f] !== '').length
  const completeness  = Math.round((filledFields / profileFields.length) * 100)

  // Contextual "what needs your attention" banner copy per pipeline stage
  const ATTENTION: Record<string, { heading: string; body: string; cta: string }> = {
    match_assigned: {
      heading: 'Your consultant has found a match',
      body: 'A brand has been identified as a great fit for you. Head to your journey page to see the details.',
      cta: 'See your match →',
    },
    match_approved: {
      heading: 'Introduction being arranged',
      body: "We've confirmed this is a strong fit and are arranging your introduction now. Expect a call soon.",
      cta: 'View your journey →',
    },
    meeting_booked: {
      heading: 'Your intro meeting is booked — prepare now',
      body: 'Think about what you want to get out of this meeting. Questions about day-to-day operations, investment returns and support structure are all fair game.',
      cta: 'View details →',
    },
    agreement_sent: {
      heading: 'Your franchise agreement is ready to review',
      body: "Take your time — this is an important document. Don't hesitate to ask your consultant for guidance.",
      cta: 'View your journey →',
    },
    agreement_signed: {
      heading: "🎉 You're in — welcome to the network",
      body: 'Your agreement is signed. Your franchisor will be in touch with onboarding details very soon.',
      cta: 'View your journey →',
    },
  }
  const attention = primaryMatch?.pipeline_stage ? ATTENTION[primaryMatch.pipeline_stage] : null

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your Franchise Foundry portal — your journey, profile and resources in one place."
      />

      {/* ── WHAT NEEDS ATTENTION ── */}
      {attention && (
        <div className="bg-brand-green/5 border border-brand-green/20 rounded-xl px-5 py-4 mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-green mb-0.5">{attention.heading}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{attention.body}</p>
          </div>
          <Link
            href="/franchisee/matches"
            className="shrink-0 text-xs font-semibold text-brand-green hover:underline whitespace-nowrap"
          >
            {attention.cta}
          </Link>
        </div>
      )}

      {/* ── PRIMARY BRAND HERO (post-assignment) ── */}
      {hasPrimaryBrand && primaryBrand && (
        <div className="bg-white rounded-2xl border border-brand-green/30 shadow-sm overflow-hidden mb-6">
          <div className="bg-brand-green/5 border-b border-brand-green/10 px-5 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-green">⭐ Your primary matched brand</span>
            <Link href="/franchisee/matches" className="text-xs font-medium text-brand-green hover:underline">
              Full journey →
            </Link>
          </div>
          <div className="p-5">
            <div className="flex items-start gap-4">
              {/* Logo / avatar */}
              <div className="shrink-0">
                {primaryBrand.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primaryBrand.logo_url}
                    alt=""
                    className="w-14 h-14 rounded-xl object-contain border border-slate-100 p-1 bg-white"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green font-bold text-xl">
                    {primaryBrand.brand_name?.charAt(0) ?? '?'}
                  </div>
                )}
              </div>

              {/* Brand details */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-900">{primaryBrand.brand_name}</p>
                <p className="text-xs text-slate-400 mb-2">{primaryBrand.category}</p>
                {primaryBrand.teaser && (
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">{primaryBrand.teaser}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {(primaryBrand.investment_display || (primaryBrand.investment_min && primaryBrand.investment_max)) && (
                    <span>💰 {primaryBrand.investment_display || formatInvestmentRange(primaryBrand.investment_min, primaryBrand.investment_max)}</span>
                  )}
                  {primaryBrand.timeline_months && (
                    <span>📅 {primaryBrand.timeline_months} month setup</span>
                  )}
                  {primaryBrand.operator_model && (
                    <span className="capitalize">🏃 {primaryBrand.operator_model.replace('-', ' ')}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Pipeline progress */}
            {primaryMatch?.pipeline_stage && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-400 mb-2">Your journey</p>
                <div className="flex gap-1 mb-2">
                  {MATCH_PIPELINE_STAGES.map((s, i) => (
                    <div key={s.value} className="flex-1">
                      <div className={`h-2 rounded-full ${i <= currentStageIdx ? 'bg-brand-green' : 'bg-slate-100'}`} />
                    </div>
                  ))}
                </div>
                {currentStage && (
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <span>{currentStage.emoji}</span>
                    <span className="font-medium">{currentStage.label}</span>
                    {currentStageIdx < MATCH_PIPELINE_STAGES.length - 1 && (
                      <span className="text-slate-400">→ next: {MATCH_PIPELINE_STAGES[currentStageIdx + 1].label}</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Consultant note */}
            {primaryMatch?.franchisor_notes && (
              <div className="mt-4 bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Note from your consultant</p>
                <p className="text-xs text-slate-600 leading-relaxed">{primaryMatch.franchisor_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PRE-ASSIGNMENT WELCOME ── */}
      {!hasPrimaryBrand && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 text-center">
          <div className="w-12 h-12 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-3 text-2xl">🗺️</div>
          <p className="text-sm font-semibold text-slate-800 mb-1">Your journey starts here</p>
          <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
            Your consultant is reviewing your profile and identifying the best franchise matches for you.
            {completeness < 100
              ? ' A complete profile helps us find a stronger fit — add the missing details below.'
              : ' We\'ll notify you as soon as your first match is ready.'}
          </p>
          {completeness < 100 && (
            <Link
              href="/franchisee/profile"
              className="mt-4 inline-block bg-brand-green hover:bg-brand-green-dark text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Complete your profile — {completeness}% done →
            </Link>
          )}
        </div>
      )}

      {/* ── STATS — always shown when profile exists ── */}
      {profileId && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Brands matched',    count: totalMatches,    colour: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200'   },
            { label: "You're interested", count: interestedCount, colour: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { label: 'Intros arranged',   count: introCount,      colour: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200'   },
          ].map(s => (
            <Link key={s.label} href="/franchisee/matches">
              <div className={`rounded-2xl border ${s.border} ${s.bg} p-5 hover:shadow-sm transition-shadow cursor-pointer`}>
                <p className={`text-3xl font-bold ${s.colour} mb-1`}>{s.count}</p>
                <p className="text-xs font-medium text-slate-500">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── QUICK LINKS ── */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/franchisee/matches">
          <Card className="p-5 hover:border-brand-green transition-colors cursor-pointer">
            <p className="text-sm font-semibold text-slate-900 mb-1">
              {hasPrimaryBrand ? 'My full journey' : 'My matches'}
            </p>
            <p className="text-xs text-slate-500">
              {hasPrimaryBrand
                ? 'See your primary and backup brands, track pipeline stages and consultant notes.'
                : 'View all matched brands in detail — investment range, model and fit score.'}
            </p>
          </Card>
        </Link>
        <Link href="/franchisee/profile">
          <Card className="p-5 hover:border-brand-green transition-colors cursor-pointer">
            <p className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
              My profile
              {completeness < 100 && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  {completeness}% complete
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500">
              Keep your investment range, locations and goals up to date for the best matches.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
