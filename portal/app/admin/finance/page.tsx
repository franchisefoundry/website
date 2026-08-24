import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Section } from '@/components/crm/Section'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const gbp = (n: number) => `£${(n ?? 0).toLocaleString()}`
const PAID = new Set(['paid', 'ff_paid'])

interface SP { tab?: string }

export default async function FinancePage({ searchParams }: { searchParams: Promise<SP> }) {
  const tab = (await searchParams).tab ?? 'overview'
  const admin = createAdminClient()

  const [{ data: commissions }, { data: agents }, { data: brands }] = await Promise.all([
    admin.from('introducer_commissions').select('introducer_id, ff_fee_amount, commission_amount, status, paid_at'),
    admin.from('profiles').select('id, full_name').eq('role', 'introducer'),
    admin.from('franchisor_profiles').select('brand_name, franchise_fee, royalty_pct, status').order('brand_name'),
  ])

  const C = commissions ?? [], A = agents ?? [], B = brands ?? []
  const nameOf = new Map(A.map(a => [a.id, a.full_name ?? 'Agent']))

  const revenueBooked = C.reduce((n, c) => n + (c.ff_fee_amount ?? 0), 0)
  const owed = C.filter(c => !PAID.has(c.status)).reduce((n, c) => n + (c.commission_amount ?? 0), 0)
  const paid = C.filter(c => PAID.has(c.status)).reduce((n, c) => n + (c.commission_amount ?? 0), 0)
  const net = revenueBooked - owed - paid

  // Payouts by agent
  const byAgent = new Map<string, { owed: number; paid: number }>()
  for (const c of C) {
    const e = byAgent.get(c.introducer_id) ?? { owed: 0, paid: 0 }
    if (PAID.has(c.status)) e.paid += c.commission_amount ?? 0
    else e.owed += c.commission_amount ?? 0
    byAgent.set(c.introducer_id, e)
  }
  const payouts = [...byAgent.entries()].map(([id, v]) => ({ name: nameOf.get(id) ?? 'Agent', ...v })).sort((a, b) => b.owed - a.owed)

  const tabLink = (id: string, label: string) => (
    <Link href={`/admin/finance?tab=${id}`}
      className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === id ? 'bg-ff-green text-white' : 'text-ink-2 hover:text-ink')}>
      {label}
    </Link>
  )

  const th = 'text-left text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-3 px-4 py-3'
  const td = 'px-4 py-3 text-sm'

  return (
    <div className="max-w-5xl">
      <PageHeader title="Finance" description="Revenue, agent payouts and fees — from your live data." />

      <div className="inline-flex bg-surface border border-line rounded-xl p-1 gap-1 mb-5">
        {tabLink('overview', 'Overview')}
        {tabLink('revenue', 'Revenue')}
        {tabLink('payouts', 'Agent payouts')}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[['Revenue booked', gbp(revenueBooked)], ['Owed to agents', gbp(owed)], ['Paid to agents', gbp(paid)], ['Net', gbp(net)]].map(([l, v]) => (
              <div key={l} className="bg-surface border border-line rounded-2xl px-[15px] py-[14px] shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
                <p className="text-[22px] font-bold tracking-tight text-ink tabular-nums leading-none">{v}</p>
                <p className="text-[11px] text-ink-3 mt-1.5">{l}</p>
              </div>
            ))}
          </div>
          <Section title="Balance">
            <div className="text-sm divide-y divide-line-2">
              <div className="flex justify-between py-2.5"><span className="text-ink-2">FF fees booked</span><span className="font-medium text-ink">{gbp(revenueBooked)}</span></div>
              <div className="flex justify-between py-2.5"><span className="text-ink-2">Agent commissions</span><span className="font-medium text-red-600">− {gbp(owed + paid)}</span></div>
              <div className="flex justify-between py-2.5"><span className="font-semibold text-ink">Net</span><span className="font-bold text-ink">{gbp(net)}</span></div>
            </div>
          </Section>
        </>
      )}

      {tab === 'revenue' && (
        <Section title="Revenue by brand" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-line-2"><tr><th className={th}>Brand</th><th className={th}>Franchise fee</th><th className={th}>Royalty %</th><th className={th}>Status</th></tr></thead>
              <tbody className="divide-y divide-line-2">
                {B.length === 0 ? <tr><td className="px-4 py-8 text-center text-ink-3 text-sm" colSpan={4}>No brands.</td></tr> :
                  B.map((b, i) => (
                    <tr key={i}>
                      <td className={cn(td, 'font-medium text-ink')}>{b.brand_name || '—'}</td>
                      <td className={cn(td, 'tabular-nums')}>{b.franchise_fee ? gbp(b.franchise_fee) : '—'}</td>
                      <td className={cn(td, 'tabular-nums')}>{b.royalty_pct != null ? `${b.royalty_pct}%` : '—'}</td>
                      <td className={cn(td, 'capitalize text-ink-2')}>{(b.status ?? '').replace('_', ' ')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {tab === 'payouts' && (
        <Section title="Agent payouts" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-line-2"><tr><th className={th}>Agent</th><th className={th}>Owed</th><th className={th}>Paid to date</th></tr></thead>
              <tbody className="divide-y divide-line-2">
                {payouts.length === 0 ? <tr><td className="px-4 py-8 text-center text-ink-3 text-sm" colSpan={3}>No commissions yet.</td></tr> :
                  payouts.map((p, i) => (
                    <tr key={i}>
                      <td className={cn(td, 'font-medium text-ink')}>{p.name}</td>
                      <td className={cn(td, 'tabular-nums font-semibold', p.owed ? 'text-ink' : 'text-ink-3')}>{gbp(p.owed)}</td>
                      <td className={cn(td, 'tabular-nums text-ink-2')}>{gbp(p.paid)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}
