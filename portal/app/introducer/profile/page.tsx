import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { SettingsTabs } from '@/components/SettingsTabs'
import NotificationSettingsCard from '@/components/NotificationSettingsCard'
import PushNotificationsCard from '@/components/PushNotificationsCard'
import InstallAppCard from '@/components/pwa/InstallAppCard'
import ReferralLinkCard from '@/components/introducer/ReferralLinkCard'
import { ensureReferralCode, referralLink } from '@/lib/referral'
import { AgentIcon, BellIcon, MarketplaceIcon, PartnerIcon } from '@/components/icons'

export default async function IntroducerProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const admin = createAdminClient()
  const code = user ? await ensureReferralCode(admin, user.id) : null
  const { count: referredCount } = user
    ? await admin.from('introducer_leads').select('id', { count: 'exact', head: true }).eq('introducer_id', user.id).eq('source', 'referral_link')
    : { count: 0 }

  const field = (label: string, value: string) => (
    <div>
      <p className="text-xs text-ink-3 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  )

  return (
    <div className="max-w-4xl">
      <PageHeader title="Account & settings" description="Your Franchise Foundry agent account." />
      <SettingsTabs
        tabs={[
          {
            id: 'account', label: 'Account', icon: <AgentIcon className="w-4 h-4" />,
            content: (
              <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.04)] p-6 max-w-md space-y-3">
                {field('Full name', profile?.full_name ?? '—')}
                {field('Email', user?.email ?? '—')}
                {field('Role', 'Agent')}
              </div>
            ),
          },
          ...(code ? [{
            id: 'referral', label: 'Referral link', icon: <PartnerIcon className="w-4 h-4" />,
            content: <ReferralLinkCard link={referralLink(code)} referredCount={referredCount ?? 0} />,
          }] : []),
          {
            id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" />,
            content: (
              <div className="space-y-4">
                <NotificationSettingsCard role="introducer" initialPrefs={profile?.notification_prefs ?? null} />
                <PushNotificationsCard role="introducer" initialPushPrefs={profile?.push_prefs ?? null} />
              </div>
            ),
          },
          { id: 'app', label: 'App', icon: <MarketplaceIcon className="w-4 h-4" />, content: <InstallAppCard /> },
        ]}
      />
    </div>
  )
}
