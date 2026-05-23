import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import AccountSettingsCard from '@/components/AccountSettingsCard'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import FranchisorPersonalForm from './personal-form'

export default async function FranchisorProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div className="space-y-8">
      <PageHeader
        title="My account"
        description="Update your personal details and account settings."
      />
      <FranchisorPersonalForm profile={profile} />
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
