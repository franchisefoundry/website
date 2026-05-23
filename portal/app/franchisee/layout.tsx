import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavSidebar } from '@/components/nav-sidebar'
import PreviewBanner from '@/components/preview-banner'

export default async function FranchiseeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Allow admins to preview this portal section
  if (profile?.role !== 'franchisee' && profile?.role !== 'admin') {
    redirect(`/${profile?.role ?? 'login'}`)
  }

  const isPreview = profile?.role === 'admin'

  // Use a mock franchisee profile shape for the sidebar when admin is previewing
  const sidebarProfile = isPreview
    ? { ...profile, role: 'franchisee' as const }
    : profile

  return (
    <div className="flex min-h-screen">
      <NavSidebar profile={sidebarProfile} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {isPreview && <PreviewBanner role="franchisee" />}
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
