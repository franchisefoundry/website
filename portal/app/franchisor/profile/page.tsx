import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { SettingsTabs } from '@/components/SettingsTabs'
import AccountSettingsCard from '@/components/AccountSettingsCard'
import NotificationSettingsCard from '@/components/NotificationSettingsCard'
import PushNotificationsCard from '@/components/PushNotificationsCard'
import InstallAppCard from '@/components/pwa/InstallAppCard'
import FranchisorPersonalForm from './personal-form'
import { FranchiseeIcon, BellIcon, MarketplaceIcon, ShieldCheckIcon } from '@/components/icons'

export default async function FranchisorProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  return (
    <div className="max-w-4xl">
      <PageHeader title="Account & settings" description="Manage your details, notifications and security." />
      <SettingsTabs
        tabs={[
          { id: 'profile', label: 'Profile', icon: <FranchiseeIcon className="w-4 h-4" />, content: <FranchisorPersonalForm profile={profile} /> },
          {
            id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" />,
            content: (
              <div className="space-y-4">
                <NotificationSettingsCard role="franchisor" initialPrefs={profile?.notification_prefs ?? null} />
                <PushNotificationsCard role="franchisor" initialPushPrefs={profile?.push_prefs ?? null} />
              </div>
            ),
          },
          { id: 'app', label: 'App', icon: <MarketplaceIcon className="w-4 h-4" />, content: <InstallAppCard /> },
          {
            id: 'security', label: 'Security', icon: <ShieldCheckIcon className="w-4 h-4" />,
            content: <AccountSettingsCard userId={user!.id} fullName={profile?.full_name ?? null} avatarUrl={profile?.avatar_url ?? null} />,
          },
        ]}
      />
    </div>
  )
}
