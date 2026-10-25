import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { BrandLogo } from '@/components/ui/BrandLogo'
import Link from 'next/link'

// The public matching quiz reads this single file (see netlify/functions/match.js).
// It is served statically from the marketing site, so the portal can fetch it directly.
const MATCHER_SOURCE = 'https://franchisefoundry.co.uk/content/franchisors.json'

type MatcherBrand = {
  id?: string
  name?: string
  category?: string
  emoji?: string
  investmentDisplay?: string
  locationsDisplay?: string
}

const norm = (s?: string | null) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

export const dynamic = 'force-dynamic'

export default async function MatchingToolPage() {
  const admin = createAdminClient()

  // 1. Live roster the public quiz actually matches against
  let matcher: MatcherBrand[] = []
  let fetchError: string | null = null
  try {
    const res = await fetch(MATCHER_SOURCE, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const list: MatcherBrand[] = Array.isArray(data) ? data : (data.partners ?? [])
    matcher = list.filter(b => b && (b.id || b.name))
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e)
  }

  // 2. Portal brand accounts
  const { data: portalRaw } = await admin
    .from('franchisor_profiles')
    .select('id, brand_name, status, logo_url')
    .is('archived_at', null)
    .not('brand_name', 'is', null)
  const portal = portalRaw ?? []

  // 3. Cross-reference by normalised key
  const portalByKey = new Map<string, (typeof portal)[number]>()
  portal.forEach(p => portalByKey.set(norm(p.brand_name), p))

  const matcherKeys = new Set<string>()
  matcher.forEach(m => { matcherKeys.add(norm(m.id)); matcherKeys.add(norm(m.name)) })

  const roster = matcher.map(m => ({
    ...m,
    portal: portalByKey.get(norm(m.id)) ?? portalByKey.get(norm(m.name)) ?? null,
  }))
  const portalOnly = portal.filter(p => !matcherKeys.has(norm(p.brand_name)))
  const noAccount = roster.filter(r => !r.portal).length

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
        description="Brands live on the public matching quiz, cross-checked against your portal accounts."
        action={
          <Link href="/admin/franchisors" className="text-sm font-medium text-ink-2 border border-line hover:border-[#cdd2c8] px-4 py-2 rounded-lg transition-colors">← All brands</Link>
        }
      />

      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 mb-6">
          Couldn&apos;t reach the matching-tool source ({fetchError}) — showing portal data only.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat n={roster.length} label="On the matching tool" />
        <Stat n={noAccount} label="No portal account" warn />
        <Stat n={portalOnly.length} label="Portal brands not matchable" warn />
      </div>

      {/* Roster — what the public quiz matches against */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(27,33,26,0.04)] mb-8">
        <div className="px-5 py-3 border-b border-line-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">On the matching tool</h2>
          <span className="text-xs text-ink-3">{roster.length} brands</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-3 bg-surface-2">
                <th className="px-5 py-2.5">Brand</th>
                <th className="px-5 py-2.5 hidden md:table-cell">Category</th>
                <th className="px-5 py-2.5 hidden sm:table-cell">Investment</th>
                <th className="px-5 py-2.5">Portal account</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r, i) => (
                <tr key={r.id ?? i} className="border-t border-line-2">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg leading-none">{r.emoji ?? '🏪'}</span>
                      <span className="font-medium text-ink">{r.name ?? r.id}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-2 hidden md:table-cell">{r.category ?? '—'}</td>
                  <td className="px-5 py-3 text-ink-2 tabular-nums hidden sm:table-cell">{r.investmentDisplay ?? '—'}</td>
                  <td className="px-5 py-3">
                    {r.portal ? (
                      <Link href={`/admin/franchisors/${r.portal.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-ff-green">
                        <span className="w-1.5 h-1.5 rounded-full bg-ff-green" />Linked
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ff-gold-ink">
                        <span className="w-1.5 h-1.5 rounded-full bg-ff-gold" />No portal account
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-ink-3">No brands found on the matching tool.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drift — portal brands the quiz can't match */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
        <div className="px-5 py-3 border-b border-line-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">In the portal, not on the matching tool</h2>
          <span className="text-xs text-ink-3">{portalOnly.length} brands</span>
        </div>
        {portalOnly.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-3">Every named portal brand is live on the matching tool. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <tbody>
                {portalOnly.map(p => (
                  <tr key={p.id} className="border-t border-line-2 first:border-t-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <BrandLogo src={p.logo_url} name={p.brand_name} size="sm" />
                        <span className="font-medium text-ink">{p.brand_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-2">{p.status}</td>
                    <td className="px-5 py-3 text-right"><Link href={`/admin/franchisors/${p.id}`} className="text-xs font-medium text-ff-green">Open →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-5 py-3 text-xs text-ink-3 border-t border-line-2">
          These won&apos;t appear in the public quiz until they&apos;re added to the matching tool (content/franchisors.json, via the CMS).
        </p>
      </div>
    </div>
  )
}
