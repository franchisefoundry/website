import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavSidebar } from '@/components/nav-sidebar'
import PreviewBanner from '@/components/preview-banner'

export default async function FranchisorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Allow admins to preview this portal section
  if (profile?.role !== 'franchisor' && profile?.role !== 'admin') {
    redirect(`/${profile?.role ?? 'login'}`)
  }

  const isPreview = profile?.role === 'admin'

  const sidebarProfile = isPreview
    ? { ...profile, role: 'franchisor' as const }
    : profile

  return (
    <div className="flex min-h-screen">
      <NavSidebar profile={sidebarProfile} />
      <main className="flex-1 overflow-auto">
        {isPreview && <PreviewBanner role="franchisor" />}
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
