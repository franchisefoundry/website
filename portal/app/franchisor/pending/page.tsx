import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export default async function FranchisorPendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // If they've since been approved, send them through
  const { data: fp } = await supabase
    .from('franchisor_profiles')
    .select('status, quiz_completed_at')
    .eq('user_id', user.id)
    .single()

  if (fp?.status === 'active') redirect('/franchisor')

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
            Thanks, {firstName} — we&apos;re reviewing your submission
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your questionnaire is with the Franchise Foundry team. We&apos;ll be in touch
            shortly to discuss your brand and grant you access to the portal.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 mb-6">
          {[
            {
              step: '1',
              title: 'Questionnaire received',
              body: 'Your answers are with our team — nicely done.',
              done: true,
            },
            {
              step: '2',
              title: 'Team review',
              body: "We'll review your brand, commercial terms, and target franchisee profile.",
              done: false,
            },
            {
              step: '3',
              title: 'Consultation call',
              body: "A consultant will reach out within 1–2 business days to introduce themselves.",
              done: false,
            },
            {
              step: '4',
              title: 'Portal access granted',
              body: "Once approved, you'll get full access to your dashboard and matched candidates.",
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

        <p className="text-center text-xs text-slate-400">
          Questions? Email us at{' '}
          <a
            href="mailto:hello@franchisefoundry.co.uk"
            className="underline hover:text-slate-600 transition-colors"
          >
            hello@franchisefoundry.co.uk
          </a>
        </p>
      </div>
    </div>
  )
}
