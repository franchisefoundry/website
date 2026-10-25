import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { BrandLogo } from '@/components/ui/BrandLogo'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// The public matching quiz (/get-matched) scores against active, non-archived
// franchisor_profiles — so THIS is the real "what's on the matching tool" list.
// A brand appears here the moment it's approved (set to Active); no CMS, no sync.
export default async function MatchingToolPage() {
  const admin = createAdminClient()

  const { data } = await admin
    .from('franchisor_profiles')
    .select('id, brand_name, category, logo_url, investment_min, investment_display, sectors, locations_available')
    .eq('status', 'active')
    .is('archived_at', null)
    .order('brand_name')

  const brands = (data ?? [])

  // A brand only matches well when its matching-critical fields are filled in.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const missingFields = (b: any): string[] => {
    const m: string[] = []
    if (!b.investment_min) m.push('investment')
    if (!b.sectors?.length) m.push('sectors')
    if (!b.category) m.push('category')
    return m
  }
  const needsData = brands.filter(b => missingFields(b).length > 0).length

  const Stat = ({ n, label, warn }: { n: number; label: string; warn?: boolean }) => (
    <div className="bg-surface border border-line rounded-2xl px-4 py-3 shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
      <p className={`text-2xl font-bold tabular-nums ${warn && n > 0 ? 'text-ff-gold-ink' : 'text-ink'}`}>{n}</p>
      <p className="text-xs text-ink-3 mt-0.5">{label}</p>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Matching tool"
        description="Every brand live on the public matching quiz. A brand appears the moment it's approved (set to Active) — this reads the same data the quiz scores against, so the two can never drift."
        action={
          <Link href="/admin/franchisors" className="text-sm font-medium text-ink-2 border border-line hover:border-[#cdd2c8] px-4 py-2 rounded-lg transition-colors">← All brands</Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <Stat n={brands.length} label="Live on the matching quiz" />
        <Stat n={needsData} label="Missing matching data" warn />
      </div>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
        <div className="px-5 py-3 border-b border-line-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">On the matching tool</h2>
          <span className="text-xs text-ink-3">{brands.length} active brands</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-3 bg-surface-2">
                <th className="px-5 py-2.5">Brand</th>
                <th className="px-5 py-2.5 hidden md:table-cell">Category</th>
                <th className="px-5 py-2.5 hidden sm:table-cell">Investment</th>
                <th className="px-5 py-2.5">Match-ready</th>
              </tr>
            </thead>
            <tbody>
              {brands.map(b => {
                const missing = missingFields(b)
                return (
                  <tr key={b.id} className="border-t border-line-2">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <BrandLogo src={b.logo_url} name={b.brand_name} size="sm" />
                        <Link href={`/admin/franchisors/${b.id}`} className="font-medium text-ink hover:underline">{b.brand_name || 'Unnamed brand'}</Link>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-2 hidden md:table-cell">{b.category || '—'}</td>
                    <td className="px-5 py-3 text-ink-2 tabular-nums hidden sm:table-cell">{b.investment_display || (b.investment_min ? `£${Math.round(b.investment_min / 1000)}k+` : '—')}</td>
                    <td className="px-5 py-3">
                      {missing.length === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ff-green"><span className="w-1.5 h-1.5 rounded-full bg-ff-green" />Ready</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ff-gold-ink"><span className="w-1.5 h-1.5 rounded-full bg-ff-gold" />Missing {missing.join(', ')}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {brands.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-ink-3">No active brands yet — approve a brand to make it matchable.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink-3 mt-4">Brands with missing matching data still appear in results but score poorly — fill in the flagged fields on the brand record to improve their matches.</p>
    </div>
  )
}
