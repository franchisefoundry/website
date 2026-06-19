import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { statusBadge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import InviteUserButton from './invite-user-button'
import { LeadsIcon, FranchiseeIcon, FranchisorIcon, MatchIcon, PartnerIcon } from '@/components/icons'

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
    { data: pendingReviews },
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
    admin.from('franchisor_profiles').select('*, profiles(full_name, email)').eq('status', 'pending_review').order('created_at', { ascending: false }).limit(5),
    admin.from('profiles').select('full_name').eq('id', user!.id).single(),
  ])

  const firstName = adminProfile?.full_name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const sections = [
    {
      title: 'Leads',
      href: '/admin/leads',
      description: 'Quiz submissions from the public matching form.',
      count: leadCount ?? 0,
      alert: meetingRequestCount ? `${meetingRequestCount} requesting a meeting` : null,
      alertColour: 'text-amber-700 bg-amber-50',
      icon: (
        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
          <LeadsIcon className="w-4 h-4 text-red-500" />
        </div>
      ),
    },
    {
      title: 'Franchisees',
      href: '/admin/franchisees',
      description: 'People with portal access ready to be matched.',
      count: franchiseeCount ?? 0,
      alert: null,
      alertColour: '',
      icon: (
        <div className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center">
          <FranchiseeIcon className="w-4 h-4 text-brand-green" />
        </div>
      ),
    },
    {
      title: 'Franchisors',
      href: '/admin/franchisors',
      description: 'Brands on the platform.',
      count: franchisorCount ?? 0,
      alert: pendingReviewCount ? `${pendingReviewCount} pending review` : null,
      alertColour: 'text-blue-700 bg-blue-50',
      icon: (
        <div className="w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center">
          <FranchisorIcon className="w-4 h-4 text-brand-gold" />
        </div>
      ),
    },
    {
      title: 'Matches',
      href: '/admin/matches',
      description: 'Franchisees assigned to a specific brand.',
      count: suggestedMatchCount ?? 0,
      alert: null,
      alertColour: '',
      icon: (
        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
          <MatchIcon className="w-4 h-4 text-violet-600" />
        </div>
      ),
    },
    {
      title: 'Marketplace Intros',
      href: '/admin/intro-requests',
      description: 'Partner introduction requests from franchisees and franchisors.',
      count: pendingIntroCount ?? 0,
      alert: pendingIntroCount ? `${pendingIntroCount} pending` : null,
      alertColour: 'text-purple-700 bg-purple-50',
      icon: (
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
          <PartnerIcon className="w-4 h-4 text-blue-600" />
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description="Here's what's happening across the Franchise Foundry portal."
        action={<InviteUserButton />}
      />

      {/* Section navigation cards — 3 primary (pipeline) + 2 secondary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {sections.slice(0, 3).map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand-green hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              {s.icon}
              <span className="text-3xl font-bold tracking-tight text-slate-900 group-hover:text-brand-green transition-colors">
                {s.count}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-0.5">{s.title}</p>
            <p className="text-xs text-slate-400 leading-snug">{s.description}</p>
            {s.alert && (
              <p className={`mt-2 text-xs font-medium px-2 py-0.5 rounded-full inline-block ${s.alertColour}`}>
                {s.alert}
              </p>
            )}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {sections.slice(3).map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-green hover:shadow-sm transition-all group flex items-center gap-4"
          >
            <div className="shrink-0">
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 mb-0.5">{s.title}</p>
              <p className="text-xs text-slate-400 leading-snug">{s.description}</p>
              {s.alert && (
                <p className={`mt-1 text-xs font-medium px-2 py-0.5 rounded-full inline-block ${s.alertColour}`}>
                  {s.alert}
                </p>
              )}
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 group-hover:text-brand-green transition-colors shrink-0">
              {s.count}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent leads needing attention */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Leads needing attention</h2>
            <Link href="/admin/leads" className="text-xs text-brand-green hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {!recentLeads?.length ? (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">No leads yet.</p>
            ) : recentLeads.map(lead => (
              <Link
                key={lead.id}
                href={`/admin/leads/${lead.id}`}
                className={`flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors border-l-2 ${
                  lead.status === 'meeting_requested' ? 'border-red-400' : 'border-transparent hover:border-brand-green'
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{lead.full_name}</p>
                  <p className="text-xs text-slate-400">{lead.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {lead.status === 'meeting_requested' && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                      Meeting requested
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{formatDate(lead.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Brands pending review */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Brands pending review</h2>
            <Link href="/admin/franchisors" className="text-xs text-brand-green hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {!pendingReviews?.length ? (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">No brands pending review.</p>
            ) : pendingReviews.map(f => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = f.profiles as any
              return (
                <Link
                  key={f.id}
                  href={`/admin/franchisors/${f.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{f.brand_name || 'Unnamed brand'}</p>
                    <p className="text-xs text-slate-400">{p?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(f.status)}
                    <span className="text-xs text-slate-400">{formatDate(f.created_at)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
