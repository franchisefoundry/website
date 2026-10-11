'use client'

/**
 * "Ask": the search-first panel. Live readout of what we understood, the
 * member's plan as switch-off-able chips, and the top partners appearing
 * under the bar with one-click intros (the plan is already known).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { PlanContext, ScoredPartner } from '@/lib/foundry/types'
import { parseQuery, formatBudget, type OffKey } from '@/lib/foundry/parse'
import { NEED_LABEL } from '@/lib/foundry/taxonomy'
import { SearchIcon } from '@/components/icons'
import { PlanChips } from './PlanChips'
import { Monogram } from './bits'
import { runSearch, requestIntros } from './client'
import { toast } from '@/lib/toast'

const SUGGESTIONS: Record<string, string[]> = {
  exploring: ['Someone to check my franchise agreement', 'Funding for my first unit', 'An accountant to build my forecast'],
  opening: ['Insurance from handover day', 'Kiosk fit-out in 6 weeks', 'EPOS for a coffee unit', 'Help hiring my first team'],
  expanding: ['Funding for a second site', 'Commercial property agent', 'Recruitment for a new site'],
  any: ['Someone to check my franchise agreement', 'Funding and an accountant', 'Insurance for a new unit', 'Shopfitter who can finish in 6 weeks'],
}

export function AskPanel({ base, plan, compact = false }: { base: string; plan: PlanContext; compact?: boolean }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [off, setOff] = useState<OffKey[]>([])
  const [live, setLive] = useState<ScoredPartner[]>([])
  const [loading, setLoading] = useState(false)
  const [requested, setRequested] = useState<Record<string, 'sending' | 'sent'>>({})
  const abort = useRef<AbortController | null>(null)

  const understood = useMemo(() => parseQuery(q), [q])
  const readout = useMemo(() => {
    const bits: string[] = []
    if (understood.needs.length) bits.push(`needs: ${understood.needs.map(n => NEED_LABEL[n].toLowerCase()).join(', ')}`)
    if (understood.sector) bits.push(`sector: ${understood.sector.label}`)
    if (understood.area) bits.push(`near: ${understood.area.label}`)
    if (understood.budget) bits.push(`budget: ~${formatBudget(understood.budget)}`)
    return bits
  }, [understood])

  // Live partners under the bar: debounced, not logged as a search.
  useEffect(() => {
    if (q.trim().length < 3) { setLive([]); return }
    const t = setTimeout(async () => {
      abort.current?.abort()
      const ctrl = new AbortController()
      abort.current = ctrl
      setLoading(true)
      try {
        const r = await runSearch(q, off, false, ctrl.signal)
        setLive([...r.groups.flatMap(g => g.items.slice(0, 1)), ...r.groups.flatMap(g => g.items.slice(1))].slice(0, 3))
      } catch { /* aborted or offline: keep what we had */ }
      finally { if (!ctrl.signal.aborted) setLoading(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [q, off])

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!q.trim()) return
    const params = new URLSearchParams({ q: q.trim() })
    if (off.length) params.set('off', off.join(','))
    router.push(`${base}/search?${params}`)
  }

  async function oneClick(p: ScoredPartner) {
    if (requested[p.id]) return
    setRequested(r => ({ ...r, [p.id]: 'sending' }))
    try {
      const res = await requestIntros({ partners: [{ id: p.id, need: q.trim() || null }], off })
      setRequested(r => ({ ...r, [p.id]: 'sent' }))
      toast(res.created.length ? `Intro requested with ${p.name}. We’ll brief them shortly.` : `You already have an open intro with ${p.name}.`, res.created.length ? 'success' : 'info')
    } catch (err) {
      setRequested(r => { const n = { ...r }; delete n[p.id]; return n })
      toast(err instanceof Error ? err.message : 'Could not send the request.', 'error')
    }
  }

  const stage = plan.stage ?? 'any'
  const toggle = (k: OffKey) => setOff(o => o.includes(k) ? o.filter(x => x !== k) : [...o, k])
  const planCount = [plan.brand, plan.sector, plan.area, plan.budget, plan.stage].filter(Boolean).length
  const applied = planCount - off.filter(k => !k.startsWith('need:')).length

  return (
    <div>
      <section aria-label="Ask The Foundry" className={cn('overflow-hidden rounded-[20px] border-2 border-ff-green bg-surface', compact ? 'shadow-[5px_5px_0_#3a4a3a]' : 'shadow-[8px_8px_0_#3a4a3a]')}>
        <form onSubmit={submit} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <SearchIcon className="hidden h-6 w-6 flex-shrink-0 text-ff-green sm:block" />
          <label htmlFor="foundry-ask" className="sr-only">Ask The Foundry</label>
          <input
            id="foundry-ask"
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="e.g. someone to check my lease before I sign"
            maxLength={300}
            autoComplete="off"
            className={cn('min-w-0 flex-[999_1_260px] bg-transparent font-semibold tracking-tight text-ink placeholder:text-[#9aa39b] focus:outline-none', compact ? 'text-lg' : 'text-xl sm:text-2xl')}
          />
          <button type="submit" disabled={!q.trim()}
            className="inline-flex min-h-[52px] flex-none items-center gap-2.5 rounded-xl bg-ff-gold px-6 text-base font-bold text-ink transition hover:brightness-105 disabled:opacity-60">
            Search <span aria-hidden="true" className="rounded border border-ink px-1.5 py-0.5 font-mono text-[11px]">↵</span>
          </button>
        </form>

        {readout.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 font-mono text-xs sm:px-6" aria-live="polite">
            <span className="text-ink-3">UNDERSTOOD</span>
            {readout.map(r => <span key={r} className="text-ink-2">{r}</span>)}
          </div>
        )}

        <PlanChips plan={plan} off={off} onToggle={toggle}
          readout={q.trim() ? `${live.length} partner${live.length === 1 ? '' : 's'} ready${planCount ? ` · ${applied} of ${planCount} plan details applied` : ''}` : planCount ? 'Your plan is applied to every search' : undefined} />

        {q.trim().length >= 3 && (
          <div className="border-t border-line">
            {live.length === 0 && !loading && (
              <p className="px-4 py-4 text-sm text-ink-2 sm:px-6">Nothing yet. Press Search and we’ll show what we have, or tell us and we’ll find someone.</p>
            )}
            {live.map(p => {
              const st = requested[p.id]
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-line-2 px-4 py-3 last:border-b-0 sm:px-6">
                  <Monogram name={p.name} />
                  <span className="min-w-0 flex-[1_1_220px]">
                    <Link href={`${base}/${p.slug}`} className="font-bold text-ink hover:underline">{p.name}</Link>
                    <span className="text-sm text-ink-3"> · {p.categoryLabel}</span>
                    <span className="block truncate text-[13px] text-ink-2">{p.why[0] ?? p.tagline}</span>
                  </span>
                  <span className="flex items-center gap-2" aria-label={`${p.fit} per cent fit`}>
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line" aria-hidden="true">
                      <span className="block h-full rounded-full bg-ff-gold" style={{ width: `${p.fit}%` }} />
                    </span>
                    <span className="font-mono text-xs text-ink-2">{p.fit}% fit</span>
                  </span>
                  <button type="button" onClick={() => oneClick(p)} disabled={!!st}
                    className={cn('min-h-[40px] rounded-lg border px-4 text-sm font-bold transition-colors',
                      st === 'sent' ? 'border-ff-green bg-ff-green text-white' : 'border-ff-green bg-surface text-ff-green hover:bg-surface-2')}>
                    {st === 'sent' ? 'Requested ✓' : st === 'sending' ? 'Sending…' : 'Request intro'}
                  </button>
                </div>
              )
            })}
            {live.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-2 px-4 py-2.5 text-xs sm:px-6">
                <span className="text-ink-3">One click sends the intro and shares your plan with that partner.</span>
                <button type="button" onClick={() => submit()} className="font-bold text-ff-green hover:underline">See all results →</button>
              </div>
            )}
          </div>
        )}
      </section>

      {!q.trim() && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] text-ink-3">{plan.stage ? `At ${plan.stage} stage, people usually ask` : 'People are asking'}</span>
          {(SUGGESTIONS[stage] ?? SUGGESTIONS.any).map(s => (
            <button key={s} type="button" onClick={() => setQ(s)}
              className="min-h-[36px] rounded-full border border-line bg-surface px-3.5 text-[13px] text-ff-green hover:border-ff-green">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
