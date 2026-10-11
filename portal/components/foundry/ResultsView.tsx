'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { PlanContext } from '@/lib/foundry/types'
import { formatBudget, type OffKey } from '@/lib/foundry/parse'
import { NEED_LABEL, type Need } from '@/lib/foundry/taxonomy'
import { SearchIcon } from '@/components/icons'
import { ResultCard } from './ResultCard'
import { PlanChips } from './PlanChips'
import { IntroListPanel } from './IntroRequest'
import { runSearch, type SearchResponse } from './client'
import { toast } from '@/lib/toast'

type Tab = 'all' | 'also' | Need

export function ResultsView({ base, initialQ, initialOff, plan }: {
  base: string; initialQ: string; initialOff: OffKey[]; plan: PlanContext
}) {
  const [q, setQ] = useState(initialQ)
  const [draft, setDraft] = useState('')
  const [off, setOff] = useState<OffKey[]>(initialOff)
  const [res, setRes] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [dealsOnly, setDealsOnly] = useState(false)
  const [sourced, setSourced] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true); setError(null)
    runSearch(q, off, true, ctrl.signal)
      .then(r => { setRes(r); setTab(t => (t === 'all' || t === 'also' || r.groups.some(g => g.need === t)) ? t : 'all') })
      .catch(e => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : 'Search failed') })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    const params = new URLSearchParams({ q })
    if (off.length) params.set('off', off.join(','))
    // Keep the URL shareable without re-rendering the server page.
    window.history.replaceState(null, '', `${base}/search?${params}`)
    return () => ctrl.abort()
  }, [q, off, base])

  const toggleOff = useCallback((k: OffKey) => setOff(o => o.includes(k) ? o.filter(x => x !== k) : [...o, k]), [])

  async function askToSource(need: Need, area: string | null) {
    const key = `${need}:${area ?? ''}`
    setSourced(s => ({ ...s, [key]: true }))
    const r = await fetch('/api/foundry/gap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ need, area, q, searchId: res?.searchId ?? null }),
    })
    if (r.ok) toast('Thanks. We’ll find someone we’d back. Track it in My intros.')
    else { setSourced(s => ({ ...s, [key]: false })); toast('Could not send that. Try again.', 'error') }
  }

  const u = res?.understood
  const chips: { key: OffKey; k: string; v: string; col: string }[] = []
  if (u) {
    for (const n of u.needs) chips.push({ key: `need:${n}`, k: 'need', v: u.needTerms[n] ?? NEED_LABEL[n].toLowerCase(), col: '#5f725f' })
    if (u.sector) chips.push({ key: 'sector', k: 'sector', v: u.sector.label, col: '#a2762f' })
    if (u.area) chips.push({ key: 'area', k: 'near', v: u.area.label, col: '#4c6a8c' })
    if (u.budget) chips.push({ key: 'budget', k: 'budget', v: `~${formatBudget(u.budget)}`, col: '#8c4c6a' })
  }

  const keep = <T extends { deal: string | null }>(xs: T[]) => dealsOnly ? xs.filter(x => x.deal) : xs
  const groups = (res?.groups ?? [])
    .filter(g => tab === 'all' || tab === g.need)
    .map(g => ({ ...g, items: keep(g.items) }))
    .filter(g => g.items.length)
  const also = tab === 'all' || tab === 'also' ? keep(res?.alsoNeed ?? []) : []
  const total = (res?.groups ?? []).reduce((n, g) => n + g.items.length, 0) + (res?.alsoNeed.length ?? 0)

  return (
    <div className="-m-4 md:-m-6 xl:-m-8 min-h-screen bg-ground">
      {/* Query bar */}
      <div className="border-b border-line bg-surface px-4 py-3.5 md:px-8">
        <form onSubmit={e => { e.preventDefault(); if (draft.trim()) { setQ(`${q} ${draft.trim()}`.trim()); setDraft('') } }}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-ff-gold bg-surface px-3 py-1.5">
          <SearchIcon className="h-4 w-4 flex-shrink-0 text-ff-gold" />
          {chips.map(c => (
            <button key={c.key} type="button" onClick={() => toggleOff(c.key)} aria-label={`Remove ${c.k} ${c.v}`}
              className="inline-flex min-h-[30px] items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 font-mono text-xs text-ink">
              <span style={{ color: c.col }}>{c.k}</span>{c.v}<span aria-hidden="true" className="text-ink-3">×</span>
            </button>
          ))}
          <label htmlFor="foundry-refine" className="sr-only">Add to your search</label>
          <input id="foundry-refine" value={draft} onChange={e => setDraft(e.target.value)} maxLength={300}
            className="min-w-[160px] flex-1 bg-transparent py-1.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none"
            placeholder={chips.length ? 'Add more…' : 'What do you need?'} />
          <button type="submit" className="min-h-[38px] rounded-lg bg-ff-gold px-4 text-sm font-bold text-ink hover:brightness-105">Search</button>
        </form>
      </div>

      {/* Tabs + deals toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 md:px-8">
        <div role="tablist" aria-label="Filter by need" className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-1">
          <TabBtn on={tab === 'all'} onClick={() => setTab('all')} label="All" n={total} />
          {(res?.groups ?? []).map(g => <TabBtn key={g.need} on={tab === g.need} onClick={() => setTab(g.need)} label={g.label} n={g.items.length} />)}
          {(res?.alsoNeed.length ?? 0) > 0 && <TabBtn on={tab === 'also'} onClick={() => setTab('also')} label="Also needed" n={res!.alsoNeed.length} />}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setDealsOnly(d => !d)} aria-pressed={dealsOnly}
            className={cn('inline-flex min-h-[36px] items-center gap-2 rounded-lg border px-3 text-[13px] text-ink', dealsOnly ? 'border-ff-gold bg-[var(--ff-gold-soft)]' : 'border-line bg-surface')}>
            <span aria-hidden="true" className={cn('h-3.5 w-3.5 rounded border-[1.5px] border-ff-gold', dealsOnly && 'bg-ff-gold')} />
            Member deals only
          </button>
          <span className="font-mono text-[11px] text-ink-3">Ranked on fit · deals never change the order</span>
        </div>
      </div>

      <div className="grid items-start gap-6 px-4 pb-28 pt-6 md:px-8 lg:grid-cols-[1fr_340px] lg:pb-6">
        <main className="flex min-w-0 flex-col gap-6">
          {res && (
            <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-4">
              <span aria-hidden="true" className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-ff-green">
                <svg width="14" height="14" viewBox="0 0 24 24"><rect x="3" y="5" width="8" height="15" rx="1" fill="#a9c2a3" /><rect x="12.5" y="3" width="8.5" height="18" rx="1" fill="#fff" /></svg>
              </span>
              <div>
                <p className="text-[15px] leading-relaxed text-ink">{res.summary}</p>
                <p className="mt-1.5 font-mono text-[11px] text-ink-3">{res.meta}</p>
              </div>
            </div>
          )}

          {loading && !res && <div className="h-40 animate-pulse rounded-2xl bg-surface" aria-label="Loading results" />}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          {groups.map(g => (
            <section key={g.need} aria-labelledby={`grp-${g.need}`}>
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <h2 id={`grp-${g.need}`} className="text-[13px] font-bold tracking-[0.08em] text-[#8a5f26]">{g.title}</h2>
                <span className="text-xs text-ink-3">{g.sub}</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {g.items.map(p => <ResultCard key={p.id} p={p} searchId={res?.searchId ?? null} />)}
              </div>
            </section>
          ))}

          {also.length > 0 && (
            <section aria-labelledby="grp-also">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <h2 id="grp-also" className="text-[13px] font-bold tracking-[0.08em] text-ff-green">YOU’LL ALSO NEED</h2>
                <span className="text-xs text-ink-3">{res?.groups.length ? 'Not in your search, but usually next' : 'Where most people start'}</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {also.map(p => <ResultCard key={p.id} p={p} searchId={res?.searchId ?? null} strongBg={false} />)}
              </div>
            </section>
          )}

          {res && !loading && groups.length === 0 && also.length === 0 && (
            <p className="rounded-2xl border border-line bg-surface p-5 text-sm text-ink-2">
              {dealsOnly ? 'No member deals match this search. Switch off “Member deals only” to see everyone.' : 'Nothing matches yet.'}
            </p>
          )}

          {(tab === 'all' ? res?.gaps ?? [] : []).map(gap => {
            const key = `${gap.need}:${gap.area ?? ''}`
            return (
              <div key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line bg-surface p-4">
                <div>
                  <div className="font-bold text-ink">{gap.message}</div>
                  <div className="text-[13px] text-ink-2">Tell us and we’ll find someone we’d back.</div>
                </div>
                <button type="button" disabled={sourced[key]} onClick={() => askToSource(gap.need, gap.area)}
                  className="min-h-[40px] rounded-lg px-2 text-sm font-bold text-[#8a5f26] hover:underline disabled:no-underline disabled:opacity-70">
                  {sourced[key] ? 'Asked ✓' : 'Ask us to source one →'}
                </button>
              </div>
            )
          })}
        </main>

        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-4">
          <IntroListPanel plan={res?.plan ?? plan} off={off} searchId={res?.searchId ?? null} query={q} />
          {res && <PlanBox plan={res.plan} off={off} onToggle={toggleOff} />}
        </aside>
      </div>
    </div>
  )
}

function TabBtn({ on, onClick, label, n }: { on: boolean; onClick: () => void; label: string; n: number }) {
  return (
    <button type="button" role="tab" aria-selected={on} onClick={onClick}
      className={cn('min-h-[34px] rounded-lg px-3.5 text-[13px] font-semibold', on ? 'bg-ff-green text-white' : 'text-ink-2 hover:text-ink')}>
      {label} <span className={cn('font-mono', on ? 'text-white/70' : 'text-ink-3')}>{n}</span>
    </button>
  )
}

function PlanBox({ plan, off, onToggle }: { plan: PlanContext; off: OffKey[]; onToggle: (k: OffKey) => void }) {
  if (![plan.brand, plan.sector, plan.area, plan.budget, plan.stage].some(Boolean)) return null
  return (
    <div className="overflow-hidden rounded-2xl border border-line [&>div]:border-t-0">
      <PlanChips plan={plan} off={off} onToggle={onToggle} />
    </div>
  )
}
