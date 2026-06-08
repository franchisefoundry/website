import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavSidebar } from '@/components/nav-sidebar'
import PreviewBanner from '@/components/preview-banner'
import InactivityTimeout from '@/components/inactivity-timeout'

export default async function IntroducerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'introducer' && profile?.role !== 'admin') {
    redirect(`/${profile?.role ?? 'login'}`)
  }

  const isPreview = profile?.role === 'admin'

  // Show agent nav when admin is previewing
  const sidebarProfile = isPreview
    ? { ...profile, role: 'introducer' as const }
    : profile

  return (
    <div className="flex min-h-screen">
      <InactivityTimeout />
      <NavSidebar profile={sidebarProfile} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {isPreview && <PreviewBanner role="introducer" />}
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
