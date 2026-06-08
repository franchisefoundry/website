import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavSidebar } from '@/components/nav-sidebar'
import InactivityTimeout from '@/components/inactivity-timeout'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'login'}`)

  return (
    <div className="flex min-h-screen">
      <InactivityTimeout />
      <NavSidebar profile={profile} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
