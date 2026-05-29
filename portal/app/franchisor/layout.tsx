import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
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

  // Multi-brand: fetch all brand profiles so the sidebar can show a switcher
  let brands: { id: string; brand_name: string | null; status: string }[] = []
  let activeBrandId: string | undefined

  if (profile?.role === 'franchisor') {
    const { data: allBrands } = await supabase
      .from('franchisor_profiles')
      .select('id, brand_name, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    brands = allBrands ?? []

    const cookieStore = await cookies()
    const fromCookie = cookieStore.get('ff_active_brand_id')?.value
    activeBrandId = brands.find(b => b.id === fromCookie)?.id ?? brands[0]?.id
  }

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
      <NavSidebar profile={sidebarProfile} brands={brands} activeBrandId={activeBrandId} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {isPreview && <PreviewBanner role="franchisor" />}
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
