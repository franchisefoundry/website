import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  // ── Nav attention badges (what needs the admin) ──────────────────────────
  const admin = createAdminClient()
  const [{ count: newLeads }, { count: pendingReview }, { count: pendingIntros }, { count: unreadMsgs }] = await Promise.all([
    admin.from('leads').select('*', { count: 'exact', head: true }).in('status', ['new', 'meeting_requested']),
    admin.from('franchisor_profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending_review').is('archived_at', null),
    admin.from('intro_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('messages').select('*', { count: 'exact', head: true }).eq('from_admin', false).is('read_at', null),
  ])

  const badges: Record<string, number> = {}
  if (newLeads) badges['/admin/leads'] = newLeads
  if (pendingReview) badges['/admin/franchisors'] = pendingReview
  if (pendingIntros) badges['/admin/partners'] = pendingIntros   // Marketplace group
  if (unreadMsgs) badges['/admin/messages'] = unreadMsgs

  return (
    <div className="flex min-h-screen">
      <InactivityTimeout />
      <NavSidebar profile={profile} badges={badges} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
