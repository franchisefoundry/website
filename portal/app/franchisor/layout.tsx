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

  // Allow admins to preview this portal section
  if (profile?.role !== 'franchisor' && profile?.role !== 'admin') {
    redirect(`/${profile?.role ?? 'login'}`)
  }

  const isPreview = profile?.role === 'admin'

  // x-pathname is injected as a REQUEST header by middleware using the
  // NextResponse.next({ request: { headers: requestHeaders } }) pattern.
  // headers() in a Server Component reads request headers, not response headers.
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isOnboarding = pathname.startsWith('/franchisor/onboarding')

  // Quiz gate — only for real franchisors, not admin previews, not the onboarding page itself
  if (!isPreview && !isOnboarding) {
    const { data: franchisorProfile } = await supabase
      .from('franchisor_profiles')
      .select('quiz_completed_at')
      .eq('user_id', user.id)
      .single()

    // Profile exists but quiz not done → send them to onboarding
    if (franchisorProfile && !franchisorProfile.quiz_completed_at) {
      redirect('/franchisor/onboarding')
    }
  }

  // Onboarding — full-screen, no sidebar
  if (isOnboarding) {
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
