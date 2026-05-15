import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function FranchisorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: brandProfile }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('franchisor_profiles').select('*').eq('user_id', user!.id).single(),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  // Calculate profile completeness
  const fields = ['brand_name', 'category', 'teaser', 'investment_min', 'investment_max', 'operator_model', 'experience_required']
  const filled = fields.filter(f => brandProfile?.[f as keyof typeof brandProfile]).length
  const completeness = Math.round((filled / fields.length) * 100)

  return (
    <div>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Your Franchise Foundry brand portal."
      />

      <div className="grid grid-cols-2 gap-6 mb-8">
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

        <Card className="p-6">
          <p className="text-sm text-slate-500 mb-1">Profile review</p>
          <p className="text-sm text-slate-700 mt-3 leading-relaxed">
            Once you&apos;ve completed your brand profile, the Franchise Foundry team will review it
            and activate it for matching. You&apos;ll hear from us directly once it&apos;s live.
          </p>
          {brandProfile?.status === 'pending_review' && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Your profile is under review. We&apos;ll be in touch shortly.
            </p>
          )}
          {brandProfile?.status === 'active' && (
            <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Your profile is active and being matched with candidates.
            </p>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">How this works</h2>
        <ol className="space-y-2">
          {[
            'Complete your brand profile with investment details, operating model and location coverage.',
            'Submit for review — the Franchise Foundry team will verify and activate your profile.',
            'We score your brand against our pool of qualified franchisee candidates.',
            'When we find strong matches, we prepare the candidate and make a warm introduction.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-600">
              <span className="w-5 h-5 rounded-full bg-brand-green text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
