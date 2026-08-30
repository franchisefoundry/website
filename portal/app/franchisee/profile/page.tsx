import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { SettingsTabs } from '@/components/SettingsTabs'
import ProfileForm from './profile-form'
import AccountSettingsCard from '@/components/AccountSettingsCard'
import NotificationSettingsCard from '@/components/NotificationSettingsCard'
import PushNotificationsCard from '@/components/PushNotificationsCard'
import InstallAppCard from '@/components/pwa/InstallAppCard'
import { FranchiseeIcon, BellIcon, MarketplaceIcon, ShieldCheckIcon } from '@/components/icons'

export default async function FranchiseeProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: profile }, { data: franchiseeProfile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('franchisee_profiles').select('*').eq('user_id', user!.id).single(),
  ])

  return (
    <div className="max-w-4xl">
      <PageHeader title="My profile & settings" description="Keep this up to date so your matches stay relevant." />
      <SettingsTabs
        tabs={[
          { id: 'profile', label: 'My details', icon: <FranchiseeIcon className="w-4 h-4" />, content: <ProfileForm profile={profile} franchiseeProfile={franchiseeProfile} /> },
          {
            id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" />,
            content: (
              <div className="space-y-4">
                <NotificationSettingsCard role="franchisee" initialPrefs={profile?.notification_prefs ?? null} />
                <PushNotificationsCard role="franchisee" initialPushPrefs={profile?.push_prefs ?? null} />
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
