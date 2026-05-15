import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import ProfileForm from './profile-form'

export default async function FranchiseeProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: franchiseeProfile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('franchisee_profiles').select('*').eq('user_id', user!.id).single(),
  ])

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Keep this up to date so your matches stay relevant."
      />
      <ProfileForm profile={profile} franchiseeProfile={franchiseeProfile} />
    </div>
  )
}
