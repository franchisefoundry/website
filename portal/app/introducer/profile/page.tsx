import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import NotificationSettingsCard from '@/components/NotificationSettingsCard'
import ReferralLinkCard from '@/components/introducer/ReferralLinkCard'
import { ensureReferralCode, referralLink } from '@/lib/referral'

export default async function IntroducerProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const admin = createAdminClient()
  const code = user ? await ensureReferralCode(admin, user.id) : null

  const { count: referredCount } = user
    ? await admin
        .from('introducer_leads')
        .select('id', { count: 'exact', head: true })
        .eq('introducer_id', user.id)
        .eq('source', 'referral_link')
    : { count: 0 }

  return (
    <div className="space-y-8">
      <PageHeader title="My Account" description="Your Franchise Foundry agent account." />
      <Card className="p-6 max-w-md">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Full name</p>
            <p className="text-sm font-medium text-slate-800">{profile?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Email</p>
            <p className="text-sm font-medium text-slate-800">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Role</p>
            <p className="text-sm font-medium text-slate-800">Agent</p>
          </div>
        </div>
      </Card>

      {code && (
        <ReferralLinkCard link={referralLink(code)} referredCount={referredCount ?? 0} />
      )}

      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4">Notifications</h2>
        <NotificationSettingsCard role="introducer" initialPrefs={profile?.notification_prefs ?? null} />
      </div>
    </div>
  )
}
