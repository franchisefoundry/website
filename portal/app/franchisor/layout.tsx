import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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

  if (profile?.role !== 'franchisor' && profile?.role !== 'admin') {
    redirect(`/${profile?.role ?? 'login'}`)
  }

  const isPreview = profile?.role === 'admin'

  // Use x-pathname (set by middleware) only to decide full-screen vs sidebar.
  // The quiz gate redirect has been moved to middleware to prevent the self-redirect
  // loop that happened when this header wasn't forwarded correctly.
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isOnboarding = pathname.startsWith('/franchisor/onboarding')
  const isPending    = pathname.startsWith('/franchisor/pending')

  if (isOnboarding || isPending) {
    return (
      <div className="min-h-screen bg-slate-50">
        {children}
      </div>
    )
  }

  const sidebarProfile = isPreview
    ? { ...profile, role: 'franchisor' as const }
    : profile

  return (
    <div className="flex min-h-screen">
      <NavSidebar profile={sidebarProfile} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {isPreview && <PreviewBanner role="franchisor" />}
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
