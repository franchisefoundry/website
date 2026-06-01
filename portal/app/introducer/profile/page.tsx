import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'

export default async function IntroducerProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  return (
    <div>
      <PageHeader title="My Account" description="Your Franchise Foundry introducer account." />
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
            <p className="text-sm font-medium text-slate-800 capitalize">Introducer</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
