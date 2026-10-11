import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NavSidebar } from '@/components/nav-sidebar'
import PreviewBanner from '@/components/preview-banner'
import InactivityTimeout from '@/components/inactivity-timeout'
import { notifyAdmins } from '@/lib/notifications'
import { canSeeFoundry, foundryMode } from '@/lib/foundry/access'
import { countOpenIntros } from '@/lib/foundry/my-intros'

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

  // First-login notification — fires once when a real franchisee first accesses their portal
  if (!isPreview && profile && !profile.first_login_notified) {
    const adminClient = createAdminClient()
    await adminClient
      .from('profiles')
      .update({ first_login_notified: true })
      .eq('id', user.id)

    await notifyAdmins({
      type:  'franchisee_first_login',
      title: 'Franchisee logged in',
      body:  `${profile.full_name || profile.email || 'A franchisee'} has logged into the portal for the first time.`,
      link:  '/admin/franchisees',
    })
  }

  // Use a mock franchisee profile shape for the sidebar when admin is previewing
  // Open intros badge on "My intros" (only when The Foundry is visible)
  const foundry = await canSeeFoundry()
  const badges: Record<string, number> = {}
  if (foundry) {
    const n = await countOpenIntros(createAdminClient(), user.id, { includeDemo: foundryMode() === 'preview' })
    if (n) badges['/franchisee/foundry/intros'] = n
  }

  const sidebarProfile = isPreview
    ? { ...profile, role: 'franchisee' as const }
    : profile

  return (
    <div className="flex min-h-screen">
      <InactivityTimeout />
      <NavSidebar profile={sidebarProfile} adminPreview={isPreview} foundry={foundry} badges={badges} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {isPreview && <PreviewBanner role="franchisee" />}
        <div className="w-full max-w-[1760px] mx-auto p-4 md:p-6 xl:p-8">{children}</div>
      </main>
    </div>
  )
}
