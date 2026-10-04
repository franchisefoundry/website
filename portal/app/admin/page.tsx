import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { AdminHomeView, type AdminHomeAction } from '@/components/admin/AdminHomeView'
import { CalendarIcon, QuestionnaireIcon, BellIcon } from '@/components/icons'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: franchiseeCount },
    { count: franchisorCount },
    { count: leadCount },
    { count: meetingRequestCount },
    { count: pendingReviewCount },
    { count: suggestedMatchCount },
    { count: pendingIntroCount },
    { data: recentLeads },
    { data: adminProfile },
  ] = await Promise.all([
    // Count only real franchisees (role = 'franchisee'), not admin users with franchisee profiles
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'franchisee'),
    admin.from('franchisor_profiles').select('*', { count: 'exact', head: true }),
    admin.from('leads').select('*', { count: 'exact', head: true }).in('status', ['new', 'meeting_requested']),
    admin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'meeting_requested'),
    admin.from('franchisor_profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    // Only count matches that an admin has deliberately assigned (not auto-suggested)
    admin.from('franchisee_profiles').select('*', { count: 'exact', head: true }).not('assigned_franchisor_id', 'is', null),
    admin.from('intro_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('leads').select('*').in('status', ['new', 'meeting_requested']).order('created_at', { ascending: false }).limit(5),
    admin.from('profiles').select('full_name').eq('id', user!.id).single(),
  ])

  const firstName = adminProfile?.full_name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const s = (n: number) => (n === 1 ? '' : 's')

  const kpis = [
    { n: leadCount ?? 0, l: 'Leads', href: '/admin/leads' },
    { n: franchiseeCount ?? 0, l: 'Franchisees', href: '/admin/franchisees' },
    { n: franchisorCount ?? 0, l: 'Brands', href: '/admin/franchisors' },
    { n: suggestedMatchCount ?? 0, l: 'Matches', href: '/admin/matches' },
  ]

  const actions = [
    meetingRequestCount ? { g: 'Today', tone: ['bg-ff-gold-soft', 'text-ff-gold-ink'], icon: <CalendarIcon className="w-[18px] h-[18px]" />, t: `Book ${meetingRequestCount} meeting${s(meetingRequestCount)}`, sub: 'Franchisees have requested a call', href: '/admin/leads', btn: 'Open' } : null,
    pendingReviewCount ? { g: 'Today', tone: ['bg-ff-green/10', 'text-ff-green'], icon: <QuestionnaireIcon className="w-[18px] h-[18px]" />, t: `Review ${pendingReviewCount} brand questionnaire${s(pendingReviewCount)}`, sub: 'Awaiting your approval', href: '/admin/franchisors', btn: 'Review' } : null,
    pendingIntroCount ? { g: 'This week', tone: ['bg-[#eff4ff]', 'text-[#3b62c4]'], icon: <BellIcon className="w-[18px] h-[18px]" />, t: `Approve ${pendingIntroCount} intro request${s(pendingIntroCount)}`, sub: 'Marketplace connections pending', href: '/admin/intro-requests', btn: 'Open' } : null,
  ].filter(Boolean) as AdminHomeAction[]

  const feed = (recentLeads ?? []).slice(0, 5).map(l => ({
    dot: 'var(--ff-gold-ink)',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    text: `New lead <b>${l.full_name}</b> ${(l as any).introducer_id ? 'from an agent referral' : 'from the matching quiz'}`,
    time: formatDate(l.created_at),
  }))

  return <AdminHomeView greeting={greeting} firstName={firstName} kpis={kpis} actions={actions} feed={feed} />
}
