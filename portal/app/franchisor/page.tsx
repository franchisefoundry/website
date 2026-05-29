import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import Link from 'next/link'
import { cookies } from 'next/headers'

export default async function FranchisorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single()

  const cookieStore = await cookies()
  // Admin preview: FranchisorPreviewButton sets ff_preview_as
  const previewAs    = profile?.role === 'admin'    ? cookieStore.get('ff_preview_as')?.value    : null
  // Multi-brand: brand switcher sets ff_active_brand_id
  const activeBrandId = profile?.role === 'franchisor' ? cookieStore.get('ff_active_brand_id')?.value : null

  const { data: brandProfile } = previewAs
    ? await admin.from('franchisor_profiles').select('*').eq('id', previewAs).single()
    : activeBrandId
      ? await supabase.from('franchisor_profiles').select('*').eq('id', activeBrandId).single()
      : await supabase.from('franchisor_profiles').select('*').eq('user_id', user!.id)
          .order('created_at', { ascending: true }).limit(1).single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  // Fetch match stats via admin client (bypasses RLS, allows role filter)
  const { data: rawMatches } = brandProfile
    ? await admin
        .from('matches')
        .select('id, status, franchisee_profiles(profiles!franchisee_profiles_user_id_fkey(role))')
        .eq('franchisor_id', brandProfile.id)
        .in('status', ['suggested', 'shown', 'interested', 'intro_made'])
    : { data: [] }

  // Exclude admin/test accounts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (rawMatches ?? []).filter(m => (m.franchisee_profiles as any)?.profiles?.role === 'franchisee')

  const incomingCount  = matches.filter(m => m.status === 'suggested' || m.status === 'shown').length
  const interestedCount = matches.filter(m => m.status === 'interested').length
  const introCount     = matches.filter(m => m.status === 'intro_made').length

  // Profile completeness
  const fields = ['brand_name', 'category', 'teaser', 'investment_min', 'investment_max', 'operator_model', 'experience_required']
  const filled = fields.filter(f => brandProfile?.[f as keyof typeof brandProfile]).length
  const completeness = Math.round((filled / fields.length) * 100)

  const isActive = brandProfile?.status === 'active'

  return (
    <div>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Your Franchise Foundry brand portal."
      />

      {/* Stats — only show when active and there are candidates */}
      {isActive && matches.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'New to review', count: incomingCount,   colour: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-200'     },
            { label: 'You\'re interested', count: interestedCount, colour: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { label: 'Intros arranged', count: introCount,    colour: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200'   },
          ].map(s => (
            <Link key={s.label} href="/franchisor/matches">
              <div className={`rounded-2xl border ${s.border} ${s.bg} p-5 hover:shadow-sm transition-shadow cursor-pointer`}>
                <p className={`text-2xl font-bold ${s.colour} mb-1`}>{s.count}</p>
                <p className="text-xs font-medium text-slate-600">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Active brand — prompt to review candidates */}
      {isActive && incomingCount > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-800">
              {incomingCount} new candidate{incomingCount !== 1 ? 's' : ''} to review
            </p>
            <p className="text-xs text-sky-600 mt-0.5">
              Review their profiles and let us know if you&apos;re interested — we&apos;ll arrange the introduction.
            </p>
          </div>
          <Link
            href="/franchisor/matches"
            className="shrink-0 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Review candidates →
          </Link>
        </div>
      )}

      {/* Active brand — no candidates yet */}
      {isActive && matches.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-emerald-800">Your brand is live</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            We&apos;re actively matching qualified candidates to your brand. You&apos;ll be notified as soon as strong matches are identified.
          </p>
        </div>
      )}

      {/* Not yet active */}
      {!isActive && brandProfile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-amber-800">
            {brandProfile.status === 'pending_review' ? 'Profile under review' : 'Profile not yet submitted'}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            {brandProfile.status === 'pending_review'
              ? 'The Franchise Foundry team is reviewing your profile. We\'ll activate it and begin matching shortly.'
              : 'Complete your brand profile and submit it for review to start receiving matched candidates.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        {/* Profile status card */}
        <Card className="p-6">
          <p className="text-sm text-slate-500 mb-1">Profile status</p>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl font-bold text-slate-900">{completeness}% complete</span>
            {brandProfile && statusBadge(brandProfile.status)}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
            <div
              className="bg-brand-green h-2 rounded-full transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
          {completeness < 100 && (
            <p className="text-xs text-slate-400 mb-3">
              A complete profile helps us match you with better-qualified candidates.
            </p>
          )}
          <Link
            href="/franchisor/brand-profile"
            className="inline-block bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {completeness === 0 ? 'Set up your profile' : 'Update your profile'}
          </Link>
        </Card>

        {/* Candidates quick link / teaser */}
        {isActive ? (
          <Link href="/franchisor/matches">
            <Card className="p-6 hover:border-brand-green transition-colors cursor-pointer h-full flex flex-col justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Candidates</p>
                <p className="text-2xl font-bold text-slate-900 mb-1">{matches.length}</p>
                <p className="text-xs text-slate-400">active in your pipeline</p>
              </div>
              <p className="mt-4 text-sm font-medium text-brand-green">View all candidates →</p>
            </Card>
          </Link>
        ) : (
          <Card className="p-6">
            <p className="text-sm text-slate-500 mb-2">How matching works</p>
            <ol className="space-y-2">
              {[
                'Complete your brand profile with investment details and operator model.',
                'Submit for review — we\'ll activate your profile.',
                'We match and brief qualified franchisee candidates.',
                'You review candidates and we arrange warm introductions.',
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5 text-xs text-slate-600">
                  <span className="w-4.5 h-4.5 rounded-full bg-brand-green text-white text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>

      {/* Intro arranged — show a reminder if any */}
      {isActive && introCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              🤝 {introCount} introduction{introCount !== 1 ? 's' : ''} arranged
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your consultant will connect you with these candidates shortly. Check your email for scheduling details.
            </p>
          </div>
          <Link
            href="/franchisor/matches"
            className="shrink-0 text-amber-700 text-xs font-semibold hover:underline"
          >
            View →
          </Link>
        </div>
      )}

      {/* Multi-brand: prompt to add another brand (only shown to real franchisors, not admin preview) */}
      {profile?.role === 'franchisor' && isActive && (
        <div className="mt-6 border border-dashed border-slate-300 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-700">Have another brand to franchise?</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Add a second brand to your account — the recruitment questionnaire is pre-filled from this one.
            </p>
          </div>
          <Link
            href="/franchisor/onboarding?add_brand=1"
            className="shrink-0 text-xs font-medium text-slate-600 border border-slate-300 hover:border-slate-400 hover:text-slate-800 px-4 py-2 rounded-lg transition-colors"
          >
            + Add brand
          </Link>
        </div>
      )}
    </div>
  )
}
