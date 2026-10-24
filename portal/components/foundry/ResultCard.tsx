'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ScoredPartner } from '@/lib/foundry/types'
import { TrustBadge, DealTag, Monogram } from './bits'
import { useIntroList } from './IntroList'

/** `compact` keeps the stacked phone layout at every width (for narrow columns like the editor preview). */
export function ResultCard({ p, searchId, strongBg = true, compact = false }: { p: ScoredPartner; searchId: string | null; strongBg?: boolean; compact?: boolean }) {
  const list = useIntroList()
  const inList = list.has(p.id)
  const strong = p.fit >= 85
  const href = `${list.base}/${p.slug}`

  return (
    <article
      className={cn(
        'grid gap-4 rounded-2xl border p-4 sm:p-5 transition-colors',
        compact ? 'grid-cols-[56px_1fr]' : 'grid-cols-[56px_1fr] md:grid-cols-[72px_1fr_210px] md:items-center',
        strong && strongBg ? 'bg-surface' : 'bg-surface-2',
        inList ? 'border-ff-green ring-1 ring-ff-green' : 'border-line',
      )}
    >
      <div className="text-center">
        <div className={cn('font-mono text-[28px] md:text-[32px] font-semibold leading-none', strong ? 'text-ff-gold-ink' : 'text-ink')}>{p.fit}</div>
        <div className={cn('mt-1 text-[11px] font-semibold', strong ? 'text-[#8a5f26]' : 'text-ink-3')}>{p.label}</div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Monogram name={p.name} />
          <Link href={href} className="text-base font-bold text-ink hover:underline">{p.name}</Link>
          <TrustBadge level={p.trust} />
          <span className="text-xs text-ink-3">{p.categoryLabel}</span>
        </div>
        {p.why.length > 0 && (
          <ul className="mt-2.5 space-y-1 text-[13px] text-ink-2">
            {p.why.map(w => (
              <li key={w} className="flex gap-2"><span aria-hidden="true" className="text-[var(--ff-ok)]">✓</span>{w}</li>
            ))}
          </ul>
        )}
        {p.facts.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[11px] text-ink-3">
            {p.facts.map(f => <span key={f}>{f}</span>)}
          </div>
        )}
      </div>

      <div className={cn('col-span-2 flex flex-col gap-2', !compact && 'md:col-span-1')}>
        {p.deal && <DealTag>{p.deal}</DealTag>}
        <button
          type="button"
          onClick={() => list.toggle({ id: p.id, slug: p.slug, name: p.name, categoryLabel: p.categoryLabel, deal: p.deal }, searchId)}
          aria-pressed={inList}
          className={cn(
            'min-h-[44px] rounded-xl border px-3 text-sm font-bold transition-colors',
            inList ? 'border-ff-green bg-transparent text-ff-green' : 'border-ff-gold bg-ff-gold text-ink hover:brightness-105',
          )}
        >
          {inList ? '✓ In intro list' : '+ Add to intro list'}
        </button>
        <Link href={href} className="text-center text-[13px] font-medium text-ink-2 hover:text-ink">View profile</Link>
      </div>
    </article>
  )
}
