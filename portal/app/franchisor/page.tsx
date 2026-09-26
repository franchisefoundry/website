import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { statusBadge } from '@/components/ui/badge'
import { Ring } from '@/components/ui/Ring'
import { CountUp } from '@/components/ui/CountUp'
import Link from 'next/link'
import { cookies } from 'next/headers'

export default async function FranchisorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user!.id).single()

  const cookieStore = await cookies()
  const previewAs    = profile?.role === 'admin'      ? cookieStore.get('ff_preview_as')?.value     : null
  const activeBrandId = profile?.role === 'franchisor' ? cookieStore.get('ff_active_brand_id')?.value : null

  const { data: brandProfile } = previewAs
    ? await admin.from('franchisor_profiles').select('*').eq('id', previewAs).single()
    : activeBrandId
      ? await supabase.from('franchisor_profiles').select('*').eq('id', activeBrandId).single()
      : await supabase.from('franchisor_profiles').select('*').eq('user_id', user!.id).order('created_at', { ascending: true }).limit(1).single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const { data: rawMatches } = brandProfile
    ? await admin.from('matches')
        .select('id, status, franchisee_profiles(profiles!franchisee_profiles_user_id_fkey(role))')
        .eq('franchisor_id', brandProfile.id).eq('franchisor_revealed', true)
        .in('status', ['suggested', 'shown', 'interested', 'intro_made'])
    : { data: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (rawMatches ?? []).filter(m => (m.franchisee_profiles as any)?.profiles?.role === 'franchisee')
  const incomingCount = matches.filter(m => m.status === 'suggested' || m.status === 'shown').length
  const interestedCount = matches.filter(m => m.status === 'interested').length
  const introCount = matches.filter(m => m.status === 'intro_made').length

  const fields = ['brand_name', 'category', 'teaser', 'investment_min', 'investment_max', 'operator_model', 'experience_required']
  const filled = fields.filter(f => brandProfile?.[f as keyof typeof brandProfile]).length
  const completeness = Math.round((filled / fields.length) * 100)
  const isActive = brandProfile?.status === 'active'

  // Contextual hero line + primary action
  let line: string, ctaLabel: string, ctaHref: string
  if (!brandProfile) { line = "Let's set up your brand profile to start matching."; ctaLabel = 'Set up your profile'; ctaHref = '/franchisor/brand-profile' }
  else if (isActive && incomingCount > 0) { line = `${incomingCount} candidate${incomingCount !== 1 ? 's are' : ' is'} waiting on you.`; ctaLabel = 'Review candidates →'; ctaHref = '/franchisor/matches' }
  else if (isActive) { line = "Your brand is live — we're actively matching candidates."; ctaLabel = 'View your profile'; ctaHref = '/franchisor/brand-profile' }
  else if (brandProfile.status === 'pending_review') { line = "Your profile is under review — we'll activate it shortly."; ctaLabel = 'View your profile'; ctaHref = '/franchisor/brand-profile' }
  else { line = 'Complete your profile and submit it for review.'; ctaLabel = 'Finish your profile'; ctaHref = '/franchisor/brand-profile' }

  const kpis = [
    { n: incomingCount, l: 'Candidates waiting' },
    { n: interestedCount, l: "You're interested" },
    { n: introCount, l: 'Intros arranged' },
    { n: completeness, l: 'Profile complete', suffix: '%' },
  ]

  return (
    <div className="max-w-5xl">
      {/* Hero */}
      <div className="rise relative overflow-hidden rounded-2xl p-6 text-white shadow-[0_18px_40px_rgba(27,33,26,0.22)] bg-gradient-to-br from-ff-green to-ff-green-deep">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(560px 220px at 88% -30%, rgba(200,146,74,0.34), transparent 60%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Welcome, {firstName}</h1>
            {brandProfile && <span className="opacity-90">{statusBadge(brandProfile.status)}</span>}
          </div>
          <p className="text-sm text-white/70 mt-1.5">{line}</p>
          <Link href={ctaHref}
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ff-green-deep shadow-[0_6px_18px_rgba(200,146,74,0.4)] bg-gradient-to-br from-ff-gold to-[#dcae6b] hover:-translate-y-0.5 transition-transform">
            {ctaLabel}
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      {isActive && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {kpis.map((k, i) => (
            <Link key={k.l} href={k.l === 'Profile complete' ? '/franchisor/brand-profile' : '/franchisor/matches'}
              className="lift rise bg-surface border border-line rounded-2xl px-4 py-4 shadow-[0_1px_2px_rgba(27,33,26,0.05)]"
              style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
              <p className="text-[28px] font-extrabold tracking-tight text-ink tabular-nums leading-none">
                <CountUp value={k.n} suffix={k.suffix ?? ''} />
              </p>
              <p className="text-[11px] text-ink-3 mt-1.5">{k.l}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Profile strength + next step */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div className="rise bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-5 flex items-center gap-5" style={{ animationDelay: '0.28s' }}>
          <Ring pct={completeness} size={96} />
          <div>
            <p className="text-sm font-bold text-ink">Profile strength</p>
            <p className="text-xs text-ink-2 mt-0.5 max-w-[22ch]">A complete profile matches you with better-qualified candidates.</p>
            <Link href="/franchisor/brand-profile" className="inline-block mt-3 text-sm font-medium text-ff-green hover:underline">
              {completeness === 0 ? 'Set up your profile →' : 'Update your profile →'}
            </Link>
          </div>
        </div>

        {isActive ? (
          <Link href="/franchisor/matches"
            className="rise lift bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-5 flex flex-col justify-between" style={{ animationDelay: '0.34s' }}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3">Your pipeline</p>
              <p className="text-[28px] font-extrabold text-ink tabular-nums mt-1"><CountUp value={matches.length} /></p>
              <p className="text-xs text-ink-3">candidates active</p>
            </div>
            <p className="mt-3 text-sm font-medium text-ff-green">View all candidates →</p>
          </Link>
        ) : (
          <div className="rise bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-5" style={{ animationDelay: '0.34s' }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-2.5">How matching works</p>
            <ol className="space-y-2">
              {['Complete your brand profile.', 'Submit for review — we activate it.', 'We match & brief qualified candidates.', 'You review; we arrange warm intros.'].map((s, i) => (
                <li key={i} className="flex gap-2.5 text-xs text-ink-2">
                  <span className="w-5 h-5 rounded-full bg-ff-green text-white text-[10px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>{s}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Intro reminder */}
      {isActive && introCount > 0 && (
        <div className="rise mt-4 bg-ff-gold-soft border border-[#e6cfa6] rounded-2xl px-5 py-4 flex items-center justify-between gap-4" style={{ animationDelay: '0.4s' }}>
          <div>
            <p className="text-sm font-semibold text-ff-gold-ink">{introCount} introduction{introCount !== 1 ? 's' : ''} arranged</p>
            <p className="text-xs text-ff-gold-ink/80 mt-0.5">Your consultant will connect you with these candidates shortly.</p>
          </div>
          <Link href="/franchisor/matches" className="shrink-0 text-ff-gold-ink text-xs font-semibold hover:underline">View →</Link>
        </div>
      )}

      {/* Add another brand */}
      {profile?.role === 'franchisor' && isActive && (
        <div className="mt-4 border border-dashed border-line rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Have another brand to franchise?</p>
            <p className="text-xs text-ink-3 mt-0.5">Add a second brand — the questionnaire is pre-filled from this one.</p>
          </div>
          <Link href="/franchisor/onboarding?add_brand=1" className="shrink-0 text-xs font-medium text-ink-2 border border-line hover:border-[#cdd2c8] px-4 py-2 rounded-lg transition-colors">+ Add brand</Link>
        </div>
      )}
    </div>
  )
}
