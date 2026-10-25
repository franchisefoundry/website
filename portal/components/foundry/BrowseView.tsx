'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { NEEDS, NEED_LABEL, REGION_LABEL, type Need, type Region } from '@/lib/foundry/taxonomy'
import type { EnginePartner, PlanContext } from '@/lib/foundry/types'
import { IntroListPanel } from './IntroRequest'
import { useIntroList } from './IntroList'
import { TrustBadge, DealTag, Monogram, Accent } from './bits'

function cover(regions: string[]) {
  if (regions.includes('uk')) return 'UK-wide'
  return regions.map(r => REGION_LABEL[r as Region] ?? r).join(', ') || 'Ask them'
}

/** Every partner this person can see, grouped by need, with quick filters. */
export function BrowseView({ partners, base, plan }: { partners: EnginePartner[]; base: string; plan: PlanContext }) {
  const list = useIntroList()
  const [need, setNeed] = useState<Need | 'all'>('all')
  const [dealsOnly, setDealsOnly] = useState(false)
  const [text, setText] = useState('')

  const shown = useMemo(() => {
    const t = text.trim().toLowerCase()
    return partners.filter(p =>
      (need === 'all' || p.category === need) &&
      (!dealsOnly || !!p.offer_text) &&
      (!t || [p.name, p.tagline, p.base_location, ...p.keywords].some(x => (x ?? '').toLowerCase().includes(t))))
  }, [partners, need, dealsOnly, text])

  const groups = NEEDS.map(n => ({ need: n, items: shown.filter(p => p.category === n) })).filter(g => g.items.length)
  const counts = new Map(NEEDS.map(n => [n, partners.filter(p => p.category === n).length]))

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="font-mono text-xs tracking-[0.1em] text-ink-3">THE FOUNDRY · ALL PARTNERS</div>
      <h1 className="mb-2 mt-2 text-4xl font-extrabold leading-none tracking-[-0.04em] text-ink sm:text-5xl">Browse every partner<Accent>.</Accent></h1>
      <p className="mb-5 max-w-[62ch] text-ink-2">Each one vetted by us. Member deals apply automatically when you request the intro through The Foundry.</p>

      <div className="sticky top-0 z-10 -mx-1 mb-5 flex flex-wrap items-center gap-2 bg-[var(--ff-ground)] px-1 py-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by need">
          <Chip on={need === 'all'} onClick={() => setNeed('all')}>All <span className="font-mono text-xs opacity-70">{partners.length}</span></Chip>
          {NEEDS.filter(n => counts.get(n)).map(n => (
            <Chip key={n} on={need === n} onClick={() => setNeed(n)}>{NEED_LABEL[n]} <span className="font-mono text-xs opacity-70">{counts.get(n)}</span></Chip>
          ))}
        </div>
        <label className={cn('inline-flex min-h-[36px] items-center gap-2 rounded-lg border px-3 text-[13px] text-ink', dealsOnly ? 'border-ff-gold bg-[var(--ff-gold-soft)]' : 'border-line bg-surface')}>
          <input type="checkbox" checked={dealsOnly} onChange={e => setDealsOnly(e.target.checked)} className="accent-[var(--ff-gold,#c8924a)]" /> Member deals only
        </label>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Filter by name or place" aria-label="Filter by name or place"
          className="min-h-[36px] min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ff-green sm:max-w-[260px]" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface py-14 text-center text-sm text-ink-3">
          {partners.length ? 'No partners match those filters.' : 'No live partners yet.'}
        </div>
      ) : groups.map(g => (
        <section key={g.need} className="mb-8" aria-labelledby={`b-${g.need}`}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id={`b-${g.need}`} className="text-xl font-extrabold text-ink">{NEED_LABEL[g.need]}</h2>
            <span className="font-mono text-xs text-ink-3">{g.items.length} partner{g.items.length === 1 ? '' : 's'}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.items.map(p => {
              const on = list.has(p.id)
              return (
                <article key={p.id} className={cn('flex flex-col gap-3 rounded-2xl border bg-surface p-4', on ? 'border-ff-green ring-1 ring-ff-green' : 'border-line')}>
                  <Link href={`${base}/${p.slug}`} className="group flex items-center gap-2.5">
                    <Monogram name={p.name} />
                    <span className="min-w-0">
                      <span className="block font-bold text-ink group-hover:underline">{p.name}</span>
                      <span className="block text-xs text-ink-3">{cover(p.regions)}{p.base_location ? ` · based in ${p.base_location}` : ''}</span>
                    </span>
                  </Link>
                  {p.tagline && <p className="text-sm text-ink-2">{p.tagline}</p>}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                    <TrustBadge level={p.trust_level} />
                    {p.price_from && <span className="font-mono">{p.price_from}</span>}
                    {p.reply_hours && <span className="font-mono">replies ~{p.reply_hours}h</span>}
                  </div>
                  {p.offer_text && <DealTag>{p.offer_text}</DealTag>}
                  <div className="mt-auto flex gap-2 pt-1">
                    <button type="button" aria-pressed={on}
                      onClick={() => list.toggle({ id: p.id, slug: p.slug, name: p.name, categoryLabel: NEED_LABEL[p.category as Need] ?? p.category, deal: p.offer_text }, null)}
                      className={cn('min-h-[40px] flex-1 rounded-xl border px-3 text-sm font-bold transition-colors',
                        on ? 'border-ff-green text-ff-green' : 'border-ff-gold bg-ff-gold text-ink hover:brightness-105')}>
                      {on ? '✓ In intro list' : '+ Add to intro list'}
                    </button>
                    <Link href={`${base}/${p.slug}`} className="inline-flex min-h-[40px] items-center rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:bg-surface-2">Profile</Link>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
      </div>
      <aside className="lg:sticky lg:top-16"><IntroListPanel plan={plan} off={[]} searchId={null} query="" /></aside>
      </div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn('inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-sm', on ? 'border-ff-green bg-ff-green text-white' : 'border-line bg-surface text-ink hover:bg-surface-2')}>
      {children}
    </button>
  )
}
