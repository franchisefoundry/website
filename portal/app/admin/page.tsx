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

  // ── Metric tiles (scannable at a glance) ──────────────────────────────────
  const metrics = [
    {
      title: 'Leads',
      href: '/admin/leads',
      count: leadCount ?? 0,
      iconBg: 'bg-red-50 text-red-500',
      icon: <LeadsIcon className="w-4 h-4" />,
    },
    {
      title: 'Franchisees',
      href: '/admin/franchisees',
      count: franchiseeCount ?? 0,
      iconBg: 'bg-brand-green/10 text-brand-green',
      icon: <FranchiseeIcon className="w-4 h-4" />,
    },
    {
      title: 'Franchisors',
      href: '/admin/franchisors',
      count: franchisorCount ?? 0,
      iconBg: 'bg-brand-gold/15 text-brand-gold',
      icon: <FranchisorIcon className="w-4 h-4" />,
    },
    {
      title: 'Matches',
      href: '/admin/matches',
      count: suggestedMatchCount ?? 0,
      iconBg: 'bg-violet-50 text-violet-600',
      icon: <MatchIcon className="w-4 h-4" />,
    },
    {
      title: 'Intros',
      href: '/admin/intro-requests',
      count: pendingIntroCount ?? 0,
      iconBg: 'bg-blue-50 text-blue-600',
      icon: <PartnerIcon className="w-4 h-4" />,
    },
  ]

  // ── Items actually needing action (surfaced above the fold) ───────────────
  const attention = [
    meetingRequestCount
      ? { label: 'meeting request', href: '/admin/leads', count: meetingRequestCount }
      : null,
    pendingReviewCount
      ? { label: 'brand pending review', href: '/admin/franchisors', count: pendingReviewCount }
      : null,
    pendingIntroCount
      ? { label: 'intro request', href: '/admin/intro-requests', count: pendingIntroCount }
      : null,
  ].filter(Boolean) as { label: string; href: string; count: number }[]

  const totalAttention = attention.reduce((n, a) => n + a.count, 0)

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description="Here's what's happening across the Franchise Foundry portal."
        action={<InviteUserButton />}
      />

      {/* ── Needs attention ─────────────────────────────────────────────── */}
      {totalAttention > 0 ? (
        <div
          className="mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--ff-gold)', background: 'var(--ff-gold-soft)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
              style={{ background: 'var(--ff-gold-ink)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Needs your attention</p>
              <p className="text-xs text-ink-2">
                {totalAttention} {totalAttention === 1 ? 'item is' : 'items are'} waiting on you.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {attention.map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="inline-flex items-center gap-1.5 rounded-xl bg-surface border border-line px-3 py-1.5 text-xs font-medium text-ink shadow-[0_1px_2px_rgba(27,33,26,0.04)] transition-all hover:shadow hover:-translate-y-px"
              >
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-white text-[11px] font-bold tabular-nums" style={{ background: 'var(--ff-gold-ink)' }}>
                  {a.count}
                </span>
                {a.count === 1 ? a.label : `${a.label}s`}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--ff-green-soft)', color: 'var(--ff-green)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm text-ink-2">
            <span className="font-semibold text-ink">You&apos;re all caught up.</span> Nothing needs review right now.
          </p>
        </div>
      )}

      {/* ── Metric tiles ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {metrics.map(m => (
          <Link
            key={m.href}
            href={m.href}
            className="group bg-surface rounded-2xl border border-line p-4 shadow-[0_1px_2px_rgba(27,33,26,0.04)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(27,33,26,0.07)] hover:border-line"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${m.iconBg}`}>
                {m.icon}
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
            <p className="text-3xl font-bold tracking-tight text-ink tabular-nums leading-none">{m.count}</p>
            <p className="text-sm text-ink-2 mt-1.5">{m.title}</p>
          </Link>
        ))}
      </div>

      {/* ── Detail lists ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent leads needing attention */}
        <div className="bg-surface rounded-2xl border border-line shadow-[0_1px_2px_rgba(27,33,26,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-line-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Leads needing attention</h2>
            <Link href="/admin/leads" className="text-xs font-medium text-brand-green hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-line-2">
            {!recentLeads?.length ? (
              <p className="px-5 py-10 text-sm text-ink-3 text-center">No leads yet.</p>
            ) : recentLeads.map(lead => (
              <Link
                key={lead.id}
                href={`/admin/leads/${lead.id}`}
                className={`flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2 transition-colors border-l-2 ${
                  lead.status === 'meeting_requested' ? 'border-red-400' : 'border-transparent'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{lead.full_name}</p>
                  <p className="text-xs text-ink-3 truncate">{lead.email}</p>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(lead as any).introducer_id && (
                    <span className="inline-block mt-1 text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-1.5 py-0.5">
                      Agent referral
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lead.status === 'meeting_requested' && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                      Meeting requested
                    </span>
                  )}
                  <span className="text-xs text-ink-3 tabular-nums">{formatDate(lead.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Brands pending review */}
        <div className="bg-surface rounded-2xl border border-line shadow-[0_1px_2px_rgba(27,33,26,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-line-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Brands pending review</h2>
            <Link href="/admin/franchisors" className="text-xs font-medium text-brand-green hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-line-2">
            {!pendingReviews?.length ? (
              <p className="px-5 py-10 text-sm text-ink-3 text-center">No brands pending review.</p>
            ) : pendingReviews.map(f => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = f.profiles as any
              return (
                <Link
                  key={f.id}
                  href={`/admin/franchisors/${f.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{f.brand_name || 'Unnamed brand'}</p>
                    <p className="text-xs text-ink-3 truncate">{p?.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(f.status)}
                    <span className="text-xs text-ink-3 tabular-nums">{formatDate(f.created_at)}</span>
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
