import Link from 'next/link'
import InviteUserButton from '@/app/admin/invite-user-button'
import { CountUp } from '@/components/ui/CountUp'
import { ArrowRightIcon } from '@/components/icons'

export interface AdminHomeAction {
  g: string
  tone: string[]
  icon: React.ReactNode
  t: string
  sub: string
  href: string
  btn: string
}

interface AdminHomeViewProps {
  greeting: string
  firstName: string
  kpis: { n: number; l: string; href: string }[]
  actions: AdminHomeAction[]
  feed: { dot: string; text: string; time: string }[]
}

/** Presentational admin dashboard — shared by the real page and /design-preview. */
export function AdminHomeView({ greeting, firstName, kpis, actions, feed }: AdminHomeViewProps) {
  const s = (n: number) => (n === 1 ? '' : 's')
  const groups = [...new Set(actions.map(a => a.g))]
  const topAction = actions[0]

  return (
    <div className="max-w-5xl">
      {/* Toolbar */}
      <div className="flex justify-end mb-3">
        <InviteUserButton />
      </div>

      {/* Hero */}
      <div className="rise relative overflow-hidden rounded-2xl p-6 text-white shadow-[0_18px_40px_rgba(27,33,26,0.22)] bg-gradient-to-br from-ff-green to-ff-green-deep">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(560px 220px at 88% -30%, rgba(200,146,74,0.34), transparent 60%)' }} />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">{greeting}, {firstName}</h1>
          <p className="text-sm text-white/70 mt-1.5">
            {actions.length ? `You have ${actions.length} thing${s(actions.length)} to action.` : "You're all caught up — nothing needs review right now."}
          </p>
          <Link href={topAction?.href ?? '/admin/leads'}
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ff-green-deep shadow-[0_6px_18px_rgba(200,146,74,0.4)] bg-gradient-to-br from-ff-gold to-[#dcae6b] hover:-translate-y-0.5 transition-transform">
            {topAction ? 'Jump to your worklist' : 'View all leads'} <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {kpis.map((k, i) => (
          <Link key={k.href} href={k.href}
            className="lift rise bg-surface border border-line rounded-2xl px-4 py-4 shadow-[0_1px_2px_rgba(27,33,26,0.05)]"
            style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
            <p className="text-[28px] font-extrabold tracking-tight text-ink tabular-nums leading-none"><CountUp value={k.n} /></p>
            <p className="text-[11px] text-ink-3 mt-1.5">{k.l}</p>
          </Link>
        ))}
      </div>

      {/* Action center + activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start mt-5">
        {/* Worklist */}
        <div>
          {actions.length === 0 ? (
            <div className="rise bg-surface border border-line rounded-2xl p-8 text-center shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
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
                  className="lift rise flex items-center gap-[13px] bg-surface border border-line rounded-2xl px-[15px] py-[13px] mb-2.5 shadow-[0_1px_2px_rgba(27,33,26,0.04)] hover:border-[#d3d7cd] transition-all group"
                  style={{ animationDelay: `${0.1 + i * 0.06}s` }}>
                  <div className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0 ${a.tone[0]} ${a.tone[1]}`}>
                    {a.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">{a.t}</p>
                    <p className="text-xs text-ink-2 mt-0.5">{a.sub}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-ff-green text-white px-3 py-1.5 rounded-lg flex-shrink-0 group-hover:gap-1.5 transition-all">{a.btn} <ArrowRightIcon className="w-3.5 h-3.5" /></span>
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Activity feed */}
        <div className="rise bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.04)]" style={{ animationDelay: '0.2s' }}>
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
