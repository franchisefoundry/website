import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { SettingsTabs } from '@/components/SettingsTabs'
import AccountSettingsCard from '@/components/AccountSettingsCard'
import NotificationSettingsCard from '@/components/NotificationSettingsCard'
import PushNotificationsCard from '@/components/PushNotificationsCard'
import BroadcastCard from '@/components/BroadcastCard'
import InstallAppCard from '@/components/pwa/InstallAppCard'
import AdminPersonalForm from './personal-form'
import { FranchiseeIcon, BellIcon, MessageIcon, MarketplaceIcon, ShieldCheckIcon } from '@/components/icons'

export default async function AdminProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  return (
    <div className="max-w-4xl">
      <PageHeader title="Account & settings" description="Your details, notifications, broadcasts and security." />
      <SettingsTabs
        tabs={[
          { id: 'profile', label: 'Profile', icon: <FranchiseeIcon className="w-4 h-4" />, content: <AdminPersonalForm profile={profile} /> },
          {
            id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" />,
            content: (
              <div className="space-y-4">
                <NotificationSettingsCard role="admin" initialPrefs={profile?.notification_prefs ?? null} />
                <PushNotificationsCard role="admin" initialPushPrefs={profile?.push_prefs ?? null} />
              </div>
            ),
          },
          { id: 'broadcast', label: 'Broadcast', icon: <MessageIcon className="w-4 h-4" />, content: <BroadcastCard /> },
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
