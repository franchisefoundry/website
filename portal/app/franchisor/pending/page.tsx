import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default async function FranchisorPendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // If any brand has been approved, send them through to the portal
  const { data: profiles } = await supabase
    .from('franchisor_profiles')
    .select('status, quiz_completed_at')
    .eq('user_id', user.id)

  if (profiles?.some(p => p.status === 'active')) redirect('/franchisor')

  const pendingCount = profiles?.filter(p => p.quiz_completed_at).length ?? 0

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <Image
            src="/logo-icon.png"
            alt="Franchise Foundry"
            width={56}
            height={56}
            className="mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Your portal is being built, {firstName}
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Thanks for completing the questionnaire. Our team is now setting up your
            profile and candidate matching — we&apos;ll have everything ready for you shortly.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 mb-6">
          {[
            {
              step: '1',
              title: 'Questionnaire received',
              body: 'Your brand information is with our team — thank you.',
              done: true,
            },
            {
              step: '2',
              title: 'Profile build & candidate matching',
              body: "We're building your franchisor profile and configuring your candidate matching criteria.",
              done: false,
            },
            {
              step: '3',
              title: 'Review call',
              body: "We'll run through your profile with you to make sure everything looks right before going live.",
              done: false,
            },
            {
              step: '4',
              title: 'Portal goes live',
              body: "Your portal is activated and you'll start receiving matched candidate introductions.",
              done: false,
            },
          ].map(item => (
            <div key={item.step} className="flex gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                item.done
                  ? 'bg-brand-green text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {item.done ? '✓' : item.step}
              </div>
              <div>
                <p className={`text-sm font-semibold ${item.done ? 'text-brand-green' : 'text-slate-700'}`}>
                  {item.title}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Self-manage: edit submission or add another brand while waiting */}
        <div className="text-center mb-4 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/franchisor/questionnaire"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand-green hover:bg-brand-green-dark px-4 py-2 rounded-lg transition-colors"
          >
            Review or edit your answers
          </Link>
          <Link
            href="/franchisor/onboarding?add_brand=1"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-300 hover:border-slate-400 hover:text-slate-800 px-4 py-2 rounded-lg transition-colors"
          >
            + Add another brand
          </Link>
          {pendingCount > 1 && (
            <p className="text-xs text-slate-400 mt-2">
              {pendingCount} brands submitted — all are currently under review.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Questions? Email us at{' '}
          <a
            href="mailto:connect@franchisefoundry.co.uk"
            className="underline hover:text-slate-600 transition-colors"
          >
            connect@franchisefoundry.co.uk
          </a>
        </p>
      </div>
    </div>
  )
}
