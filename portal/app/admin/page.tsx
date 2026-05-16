import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { statusBadge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import InviteUserButton from './invite-user-button'

export default async function AdminDashboard() {
  const supabase = await createClient()

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
  ] = await Promise.all([
    supabase.from('franchisee_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('franchisor_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'meeting_requested'),
    supabase.from('franchisor_profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'suggested'),
    supabase.from('intro_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('leads').select('*').in('status', ['new', 'meeting_requested']).order('created_at', { ascending: false }).limit(5),
    supabase.from('franchisor_profiles').select('*, profiles(full_name, email)').eq('status', 'pending_review').order('created_at', { ascending: false }).limit(5),
  ])

  const sections = [
    {
      title: 'Leads',
      href: '/admin/leads',
      description: 'Quiz submissions from the public matching form.',
      count: leadCount ?? 0,
      alert: meetingRequestCount ? `${meetingRequestCount} requesting a meeting` : null,
      alertColour: 'text-amber-700 bg-amber-50',
      icon: '📋',
    },
    {
      title: 'Franchisees',
      href: '/admin/franchisees',
      description: 'People with portal access ready to be matched.',
      count: franchiseeCount ?? 0,
      alert: null,
      alertColour: '',
      icon: '👤',
    },
    {
      title: 'Franchisors',
      href: '/admin/franchisors',
      description: 'Brands on the platform.',
      count: franchisorCount ?? 0,
      alert: pendingReviewCount ? `${pendingReviewCount} pending review` : null,
      alertColour: 'text-blue-700 bg-blue-50',
      icon: '🏢',
    },
    {
      title: 'Matches',
      href: '/admin/matches',
      description: 'Franchisee ↔ brand match suggestions.',
      count: suggestedMatchCount ?? 0,
      alert: suggestedMatchCount ? `${suggestedMatchCount} unreviewed` : null,
      alertColour: 'text-brand-green bg-green-50',
      icon: '🎯',
    },
    {
      title: 'Intro requests',
      href: '/admin/intro-requests',
      description: 'Partner introduction requests from franchisees.',
      count: pendingIntroCount ?? 0,
      alert: pendingIntroCount ? `${pendingIntroCount} pending` : null,
      alertColour: 'text-purple-700 bg-purple-50',
      icon: '🤝',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of the Franchise Foundry portal."
        action={<InviteUserButton />}
      />

      {/* Section navigation cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {sections.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand-green hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-2xl font-bold text-slate-900 group-hover:text-brand-green transition-colors">
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

      <div className="grid grid-cols-2 gap-6">
        {/* Recent leads needing attention */}
        <div className="bg-white rounded-2xl border border-slate-200">
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
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
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
