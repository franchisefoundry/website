import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import InviteUserButton from './invite-user-button'

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

  // ── KPI bar (artifact home) ───────────────────────────────────────────────
  const kpis = [
    { n: leadCount ?? 0, l: 'Leads', href: '/admin/leads' },
    { n: franchiseeCount ?? 0, l: 'Franchisees', href: '/admin/franchisees' },
    { n: franchisorCount ?? 0, l: 'Brands', href: '/admin/franchisors' },
    { n: suggestedMatchCount ?? 0, l: 'Matches', href: '/admin/matches' },
  ]

  const s = (n: number) => (n === 1 ? '' : 's')
  const CAL = <path d="M3 4h18v18H3zM16 2v4M8 2v4M3 10h18" />
  const DOC = <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />
  const BELL = <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>

  // ── Action-center worklist (artifact home) ────────────────────────────────
  const actions = [
    meetingRequestCount ? { g: 'Today', tone: ['bg-red-50', 'text-red-600'], icon: CAL, t: `Book ${meetingRequestCount} meeting${s(meetingRequestCount)}`, sub: 'Franchisees have requested a call', href: '/admin/leads', btn: 'Open' } : null,
    pendingReviewCount ? { g: 'Today', tone: ['bg-amber-50', 'text-amber-700'], icon: DOC, t: `Review ${pendingReviewCount} brand questionnaire${s(pendingReviewCount)}`, sub: 'Awaiting your approval', href: '/admin/franchisors', btn: 'Review' } : null,
    pendingIntroCount ? { g: 'This week', tone: ['bg-blue-50', 'text-blue-600'], icon: BELL, t: `Approve ${pendingIntroCount} intro request${s(pendingIntroCount)}`, sub: 'Marketplace connections pending', href: '/admin/intro-requests', btn: 'Open' } : null,
  ].filter(Boolean) as { g: string; tone: string[]; icon: React.ReactNode; t: string; sub: string; href: string; btn: string }[]

  const groups = [...new Set(actions.map(a => a.g))]

  // ── Activity feed (artifact home) ─────────────────────────────────────────
  const feed = [
    ...(recentLeads ?? []).slice(0, 5).map(l => ({
      dot: 'var(--ff-gold-ink)',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text: `New lead <b>${l.full_name}</b> ${(l as any).introducer_id ? 'from an agent referral' : 'from the matching quiz'}`,
      time: formatDate(l.created_at),
    })),
  ]

  return (
    <div>
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink">{greeting}, {firstName}</h1>
          <p className="text-[13.5px] text-ink-2 mt-1">
            {actions.length ? `You have ${actions.length} thing${s(actions.length)} to action.` : "You're all caught up — nothing needs review right now."}
          </p>
        </div>
        <InviteUserButton />
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map(k => (
          <Link key={k.href} href={k.href}
            className="bg-surface border border-line rounded-2xl px-[15px] py-[14px] shadow-[0_1px_2px_rgba(27,33,26,0.04)] hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(27,33,26,0.07)] transition-all">
            <p className="text-[22px] font-bold tracking-tight text-ink tabular-nums leading-none">{k.n}</p>
            <p className="text-[11px] text-ink-3 mt-1.5">{k.l}</p>
          </Link>
        ))}
      </div>

      {/* Action center + activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Worklist */}
        <div>
          {actions.length === 0 ? (
            <div className="bg-surface border border-line rounded-2xl p-8 text-center shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
              <div className="w-10 h-10 rounded-full bg-ff-green/10 text-ff-green flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <p className="text-sm font-semibold text-ink">You&apos;re all caught up</p>
              <p className="text-xs text-ink-3 mt-0.5">Nothing needs your attention right now.</p>
            </div>
          ) : groups.map(g => (
            <div key={g}>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3 mt-1 first:mt-0 mb-2.5">{g}</p>
              {actions.filter(a => a.g === g).map((a, i) => (
                <Link key={i} href={a.href}
                  className="flex items-center gap-[13px] bg-surface border border-line rounded-2xl px-[15px] py-[13px] mb-2.5 shadow-[0_1px_2px_rgba(27,33,26,0.04)] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(27,33,26,0.06)] hover:border-[#d3d7cd] transition-all group">
                  <div className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0 ${a.tone[0]} ${a.tone[1]}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{a.icon}</svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">{a.t}</p>
                    <p className="text-xs text-ink-2 mt-0.5">{a.sub}</p>
                  </div>
                  <span className="text-xs font-medium bg-ff-green text-white px-3 py-1.5 rounded-lg flex-shrink-0">{a.btn}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Activity feed */}
        <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
          <p className="px-4 pt-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">Recent activity</p>
          {feed.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-3 text-center">No recent activity.</p>
          ) : feed.map((f, i) => (
            <div key={i} className="flex gap-2.5 px-4 py-3 border-t border-line-2">
              <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: f.dot }} />
              <div>
                <p className="text-[12.5px] leading-snug text-ink" dangerouslySetInnerHTML={{ __html: f.text }} />
                <p className="text-[11px] text-ink-3 mt-0.5">{f.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
