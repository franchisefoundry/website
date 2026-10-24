import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { MarketplaceTabs } from '@/components/admin/MarketplaceTabs'
import { foundryMode } from '@/lib/foundry/access'
import { loadInsights, PERIODS, type Channel, type RoleFilter } from '@/lib/foundry/insights'
import { OutreachButton } from '@/components/foundry/admin/OutreachButton'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Search insights · Franchise Foundry' }

const CHANNELS: [Channel, string][] = [['all', 'All'], ['website', 'Website'], ['portal', 'Portal']]
const ROLES: [RoleFilter, string][] = [['all', 'Everyone'], ['franchisee', 'Franchisees'], ['franchisor', 'Franchisors'], ['introducer', 'Agents'], ['visitor', 'Website visitors']]
const ROLE_LABEL: Record<string, string> = { franchisee: 'Franchisees', franchisor: 'Franchisors', introducer: 'Agents', admin: 'Admins', visitor: 'Website visitors' }
const FUNNEL_COL = ['#3A4A3A', '#4E5F4E', '#6B7C6B', '#C8924A', '#2F7A4A']

export default async function Page({ searchParams }: { searchParams: Promise<{ d?: string; ch?: string; role?: string }> }) {
  const sp = await searchParams
  const days = PERIODS.some(([d]) => String(d) === sp.d) ? Number(sp.d) : 30
  const channel = (CHANNELS.some(([c]) => c === sp.ch) ? sp.ch : 'all') as Channel
  const role = (ROLES.some(([r]) => r === sp.role) ? sp.role : 'all') as RoleFilter
  const demo = foundryMode() === 'preview'
  const ins = await loadInsights(createAdminClient(), { days, channel, role, includeDemo: demo })
  const href = (p: Partial<{ d: number; ch: string; role: string }>) => {
    const q = new URLSearchParams({ d: String(p.d ?? days), ch: p.ch ?? channel, role: p.role ?? role })
    return `/admin/foundry/insights?${q}`
  }
  const seg = (on: boolean) => cn('rounded-lg px-3 py-1.5 text-sm', on ? 'bg-surface font-bold text-ink shadow-sm' : 'font-medium text-ink-2 hover:text-ink')
  const top = Math.max(1, ins.funnel[0]?.n ?? 1)
  const maxDemand = Math.max(1, ...ins.demand.map(d => Math.max(d.searches, d.partners * 10)))
  const card = 'rounded-2xl border border-line bg-surface p-5'
  const h = 'text-base font-extrabold text-ink'

  return (
    <div>
      <PageHeader title="Marketplace" description="What people look for, where we come up short, and who to recruit next." />
      <MarketplaceTabs />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-1 rounded-xl bg-surface-2 p-1">{PERIODS.map(([d, l]) => <Link key={d} href={href({ d })} className={seg(d === days)}>{l}</Link>)}</div>
        <div className="inline-flex gap-1 rounded-xl bg-surface-2 p-1">{CHANNELS.map(([c, l]) => <Link key={c} href={href({ ch: c })} className={seg(c === channel)}>{l}</Link>)}</div>
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">{ROLES.map(([r, l]) => <Link key={r} href={href({ role: r })} className={seg(r === role)}>{l}</Link>)}</div>
      </div>

      <section className={cn(card, 'mb-5')} aria-labelledby="funnel-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="funnel-h" className="font-mono text-[11px] tracking-[0.08em] text-ink-3">FUNNEL · LAST {days} DAYS</h2>
          <span className="text-xs text-ink-3">Work won is member-reported</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-5">
          {ins.funnel.map((f, i) => (
            <div key={f.label}>
              <div className="font-mono text-2xl font-bold text-ink">{f.n}</div>
              <div className="text-sm font-semibold text-ink">{f.label}</div>
              <div className="mt-1.5 h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full" style={{ width: `${Math.round((f.n / top) * 100)}%`, background: FUNNEL_COL[i] }} /></div>
              <div className="mt-1 text-xs text-ink-3">{f.note}</div>
            </div>
          ))}
        </div>
        {role === 'all' && ins.roles.length > 0 && (
          <p className="mt-4 text-xs text-ink-2">Searches by who: {ins.roles.map(r => `${ROLE_LABEL[r.role] ?? r.role} ${r.n}`).join(' · ')}</p>
        )}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className={card} aria-labelledby="gaps-h">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 id="gaps-h" className={h}>Searches we couldn’t answer</h2>
              <p className="text-sm text-ink-2">Each one is a partner we should be recruiting.</p>
            </div>
            <span className="font-mono text-xs text-ink-3">{ins.gaps.length} gaps</span>
          </div>
          {ins.gaps.length === 0 ? <p className="mt-4 text-sm text-ink-3">Nothing unanswered in this period.</p> : (
            <ul className="mt-3 divide-y divide-line">
              {ins.gaps.map(g => (
                <li key={g.query} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">“{g.query}”</div>
                    <div className="text-xs text-ink-2">{g.why}</div>
                  </div>
                  <span className="font-mono text-sm text-ink-2">{g.n}×</span>
                  {g.application
                    ? <Link href={`/admin/foundry/applications?id=${g.application.id}`} className="min-h-[36px] rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-2">Review application</Link>
                    : <OutreachButton query={g.query} need={g.need} area={g.area} searches={g.n} demo={demo} initial={g.outreach} />}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          <section className={card} aria-labelledby="demand-h">
            <h2 id="demand-h" className={h}>Demand vs supply</h2>
            <p className="text-xs text-ink-3"><span className="mr-1 inline-block h-2 w-3 rounded-sm bg-ff-green" />Searches <span className="ml-3 mr-1 inline-block h-2 w-3 rounded-sm bg-ff-gold" />Live partners (×10)</p>
            {ins.demand.length === 0 ? <p className="mt-3 text-sm text-ink-3">No searches yet.</p> : (
              <ul className="mt-3 space-y-2.5">
                {ins.demand.map(d => (
                  <li key={d.need} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm">
                    <span className="truncate text-ink">{d.label}</span>
                    <span className="space-y-1">
                      <span className="block h-2 rounded-full bg-ff-green" style={{ width: `${Math.max(2, Math.round((d.searches / maxDemand) * 100))}%` }} title={`${d.searches} searches`} />
                      <span className="block h-2 rounded-full bg-ff-gold" style={{ width: `${Math.max(d.partners ? 2 : 0, Math.round((d.partners * 10 / maxDemand) * 100))}%` }} title={`${d.partners} live partners`} />
                    </span>
                    <span className={cn('text-xs font-semibold', d.flag === 'No supply' ? 'text-[var(--ff-crit)]' : d.flag === 'Stretched' ? 'text-[#8a5f26]' : 'text-[#2f7a4a]')}>{d.flag}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card} aria-labelledby="top-h">
            <h2 id="top-h" className={h}>Top searches</h2>
            {ins.top.length === 0 ? <p className="mt-3 text-sm text-ink-3">No searches yet.</p> : (
              <ol className="mt-2 divide-y divide-line">
                {ins.top.map((t, i) => (
                  <li key={t.query} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-5 font-mono text-xs text-ink-3">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{t.query}</span>
                    <span className="font-mono text-ink-2">{t.n}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <section className={cn(card, 'mt-5')} aria-labelledby="perf-h">
        <div className="flex items-baseline justify-between">
          <h2 id="perf-h" className={h}>Partner performance</h2>
          <Link href="/admin/foundry/partners" className="text-sm font-semibold text-ff-green hover:underline">All partners →</Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] tracking-[0.08em] text-ink-3">
                <th className="py-2 font-normal">PARTNER</th><th className="py-2 text-right font-normal">VIEWS</th><th className="py-2 text-right font-normal">INTROS</th>
                <th className="py-2 text-right font-normal">WON</th><th className="py-2 pl-6 font-normal">FEEDBACK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ins.partners.map(p => (
                <tr key={p.id}>
                  <td className="py-2.5"><Link href={`/admin/foundry/partners/${p.id}`} className="font-semibold text-ink hover:underline">{p.name}</Link></td>
                  <td className="py-2.5 text-right font-mono">{p.views}</td>
                  <td className="py-2.5 text-right font-mono">{p.intros}</td>
                  <td className="py-2.5 text-right font-mono">{p.won}</td>
                  <td className={cn('py-2.5 pl-6 text-xs font-semibold', p.feedback === 'Going well' ? 'text-[#2f7a4a]' : p.feedback === 'Mixed' ? 'text-[#8a5f26]' : p.feedback ? 'text-[var(--ff-crit)]' : 'text-ink-3')}>{p.feedback ?? 'No ratings yet'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
