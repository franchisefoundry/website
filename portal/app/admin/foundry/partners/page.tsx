import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { MarketplaceTabs } from '@/components/admin/MarketplaceTabs'
import { foundryMode } from '@/lib/foundry/access'
import { loadPartnerBoard, type BoardRow } from '@/lib/foundry/partner-board'
import { Monogram } from '@/components/foundry/bits'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Partners · Franchise Foundry' }

const TABS = [['all', 'All'], ['live', 'Live'], ['draft', 'Draft'], ['paused', 'Paused'], ['missing', 'Missing info']] as const
type Tab = typeof TABS[number][0]
const TRUST: Record<string, [string, string]> = {
  recommended: ['Recommended', 'bg-ff-gold text-ink'],
  trusted: ['Trusted', 'bg-[var(--ff-ok-bg,#e3f1e8)] text-[#25613d]'],
  listed: ['Listed', 'bg-surface-2 text-ink-2'],
}
const STATUS: Record<string, [string, string]> = {
  live: ['● Live', 'border-[#bfe0cb] bg-[var(--ff-ok-bg,#e3f1e8)] text-[#25613d]'],
  draft: ['◌ Draft', 'border-dashed border-ff-gold text-[#8a5f26]'],
  paused: ['○ Paused', 'border-line bg-surface-2 text-ink-3'],
}

function pick(rows: BoardRow[], tab: Tab) {
  if (tab === 'all') return rows
  if (tab === 'missing') return rows.filter(r => r.gaps.length)
  return rows.filter(r => r.status === tab)
}

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: t } = await searchParams
  const tab = (TABS.some(([k]) => k === t) ? t : 'all') as Tab
  const { rows, kpis, attention } = await loadPartnerBoard(createAdminClient(), { includeDemo: foundryMode() === 'preview' })
  const shown = pick(rows, tab)
  const delta = kpis.intros30 - kpis.introsPrev30
  const KPIS = [
    { l: 'Live partners', v: `${kpis.live}/${kpis.total}`, d: `${kpis.categoriesCovered} of 8 categories covered` },
    { l: 'Intros, last 30 days', v: String(kpis.intros30), d: kpis.introsPrev30 || kpis.intros30 ? `${delta >= 0 ? '+' : ''}${delta} on the 30 days before` : 'None yet' },
    { l: 'Intro to work', v: kpis.toWork == null ? '–' : `${kpis.toWork}%`, d: 'Of closed intros, members who hired them' },
    { l: 'Median reply', v: kpis.replyHours == null ? '–' : `${kpis.replyHours}h`, d: 'Briefed to first contact. Target under 24h' },
    { l: 'Member deals live', v: String(kpis.deals), d: 'Live partners with an offer', gold: true },
  ]

  return (
    <div>
      <PageHeader title="Marketplace" description="Who members see, how partners are performing, and what needs your attention." />
      <MarketplaceTabs />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {KPIS.map(k => (
          <div key={k.l} className={cn('rounded-2xl border bg-surface p-4', k.gold ? 'border-ff-gold' : 'border-line')}>
            <div className="text-xs text-ink-2">{k.l}</div>
            <div className={cn('mt-1 font-mono text-2xl font-bold', k.gold ? 'text-[#8a5f26]' : 'text-ink')}>{k.v}</div>
            <div className="mt-0.5 text-[11px] text-ink-3">{k.d}</div>
          </div>
        ))}
      </div>

      {attention.length > 0 && (
        <section aria-labelledby="att-h" className="mb-5 rounded-2xl border border-ff-gold bg-[var(--ff-gold-soft)] p-4 text-sm text-[#6b4a1d]">
          <h2 id="att-h" className="font-bold">Needs attention</h2>
          <ul className="mt-1.5 space-y-1">
            {attention.map((a, i) => (
              <li key={a.id + i}><Link href={`/admin/foundry/partners/${a.id}`} className="font-semibold underline">{a.name}</Link> {a.text}.</li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
          {TABS.map(([k, l]) => (
            <Link key={k} href={k === 'all' ? '/admin/foundry/partners' : `/admin/foundry/partners?tab=${k}`}
              className={cn('rounded-lg px-3 py-1.5 text-sm', tab === k ? 'bg-surface font-bold text-ink shadow-sm' : 'font-medium text-ink-2 hover:text-ink')}>
              {l} <span className="font-mono text-xs opacity-70">{pick(rows, k).length}</span>
            </Link>
          ))}
        </div>
        <Link href="/admin/foundry/partners/new" className="inline-flex min-h-[40px] items-center rounded-xl bg-ff-green px-4 text-sm font-bold text-white hover:brightness-110">+ Add partner</Link>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface py-14 text-center text-sm text-ink-3">
          {rows.length ? 'Nothing in this view.' : 'No partners yet. Add one, or approve an application.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[11px] tracking-[0.08em] text-ink-3">
                <th className="px-4 py-2.5 font-normal">PARTNER</th><th className="px-3 py-2.5 font-normal">TRUST</th><th className="px-3 py-2.5 font-normal">DEAL</th>
                <th className="px-3 py-2.5 text-right font-normal">INTROS 30D</th><th className="px-3 py-2.5 text-right font-normal">TO WORK</th>
                <th className="px-3 py-2.5 text-right font-normal">REPLY</th><th className="px-3 py-2.5 font-normal">STATUS</th><th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map(r => (
                <tr key={r.id} className="hover:bg-surface-2/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/foundry/partners/${r.id}`} className="flex items-center gap-3">
                      <Monogram name={r.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{r.name}{r.isDemo && <span className="ml-2 rounded-full border border-dashed border-ff-gold px-1.5 text-[10px] font-semibold text-[#8a5f26]">Demo</span>}</span>
                        <span className="block text-xs text-ink-3">{r.categoryLabel}{r.gaps.length ? ` · missing ${r.gaps.length}` : ''}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3"><span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', TRUST[r.trust]?.[1])}>{TRUST[r.trust]?.[0] ?? r.trust}</span></td>
                  <td className={cn('max-w-[220px] truncate px-3 py-3 text-xs', r.deal ? 'font-semibold text-[#8a5f26]' : 'text-ink-3')}>{r.deal ?? 'None'}</td>
                  <td className="px-3 py-3 text-right font-mono">{r.intros30}</td>
                  <td className="px-3 py-3 text-right font-mono">{r.toWork == null ? '–' : `${r.toWork}%`}</td>
                  <td className={cn('px-3 py-3 text-right font-mono', r.replyHours != null && r.replyHours > 24 && 'text-[var(--ff-crit)]')}>{r.replyHours == null ? '–' : `${r.replyHours}h`}{r.stuck ? <span className="ml-1 text-[var(--ff-crit)]">· {r.stuck} stuck</span> : null}</td>
                  <td className="px-3 py-3"><span className={cn('whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold', STATUS[r.status]?.[1])}>{STATUS[r.status]?.[0] ?? r.status}</span></td>
                  <td className="px-4 py-3 text-right"><Link href={`/admin/foundry/partners/${r.id}`} className="font-semibold text-ff-green hover:underline">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
