import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import ProfileForm from './profile-form'
import AccountSettingsCard from '@/components/AccountSettingsCard'
import NotificationSettingsCard from '@/components/NotificationSettingsCard'

export default async function FranchiseeProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: franchiseeProfile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('franchisee_profiles').select('*').eq('user_id', user!.id).single(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="My profile"
        description="Keep this up to date so your matches stay relevant."
      />
      <ProfileForm profile={profile} franchiseeProfile={franchiseeProfile} />
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4">Notifications</h2>
        <NotificationSettingsCard role="franchisee" initialPrefs={profile?.notification_prefs ?? null} />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4">Account settings</h2>
        <AccountSettingsCard
          userId={user!.id}
          fullName={profile?.full_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
        />
      </div>
    </div>
  )
}
