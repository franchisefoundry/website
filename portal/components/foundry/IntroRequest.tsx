'use client'

/**
 * The intro list panel (sidebar) and the "Request intros" dialog.
 * Members are signed in, so there's no email step: one form, one click.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { PlanContext } from '@/lib/foundry/types'
import type { OffKey } from '@/lib/foundry/parse'
import { formatBudget } from '@/lib/foundry/parse'
import { Monogram, Accent } from './bits'
import { useIntroList, type ListItem } from './IntroList'
import { requestIntros, briefByLabel, STAGE_LABEL, type IntroResponse } from './client'

const STEPS = ['Requested', 'Briefed', 'Contacted you', 'How did it go?']
const CALL_TIMES = [['mornings', 'Mornings'], ['afternoons', 'Afternoons'], ['evenings', 'Evenings']] as const

export function IntroListPanel({ plan, off, searchId, query }: {
  plan: PlanContext; off: OffKey[]; searchId: string | null; query: string
}) {
  const list = useIntroList()
  const [open, setOpen] = useState(false)
  const n = list.items.length

  return (
    <>
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-extrabold text-ink">Your intro list</h2>
          <span className="font-mono text-xs text-ink-3">{n} selected</span>
        </div>
        <div className="mt-3.5 flex flex-col gap-2">
          {list.items.map(i => (
            <div key={i.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
              <Monogram name={i.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-ink">{i.name}</span>
                <span className="block text-[11px] text-ink-3">{i.categoryLabel}</span>
              </span>
              <button type="button" onClick={() => list.remove(i.id)} aria-label={`Remove ${i.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-ink-3 hover:bg-surface hover:text-ink">×</button>
            </div>
          ))}
          {n === 0 && (
            <div className="rounded-xl border border-dashed border-line p-4 text-center text-[13px] text-ink-3">
              Add partners and we’ll introduce you to all of them in one go.
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={n === 0}
          onClick={() => setOpen(true)}
          className="mt-3.5 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ff-green text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {n ? `Request ${n} ${n === 1 ? 'intro' : 'intros'} →` : 'Request intros →'}
        </button>
        <ol className="mt-4 space-y-2 border-t border-line pt-4 text-xs text-ink-2">
          <li className="flex gap-2"><span className="font-mono text-[#8a5f26]">1</span>We brief each partner on your plan</li>
          <li className="flex gap-2"><span className="font-mono text-[#8a5f26]">2</span>They contact you, usually within a day</li>
          <li className="flex gap-2"><span className="font-mono text-[#8a5f26]">3</span>We keep you posted on every step</li>
        </ol>
      </div>
      <p className="rounded-xl border border-line px-4 py-3 text-[13px] text-ink-2">
        Free for you. Member deals apply automatically when you come through us.
      </p>
      {n > 0 && !open && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)}
            className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-ff-green text-base font-bold text-white">
            Request {n} {n === 1 ? 'intro' : 'intros'} →
          </button>
        </div>
      )}
      {open && (
        <IntroRequestDialog
          items={list.items}
          plan={plan}
          off={off}
          searchId={searchId}
          defaultNeed={query}
          onClose={() => setOpen(false)}
          onSent={() => list.clear()}
        />
      )}
    </>
  )
}

export function IntroRequestDialog({ items, plan, off, searchId, defaultNeed, onClose, onSent }: {
  items: ListItem[]
  plan: PlanContext
  off: OffKey[]
  searchId: string | null
  defaultNeed: string
  onClose: () => void
  onSent: () => void
}) {
  const [needs, setNeeds] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map(i => [i.id, defaultNeed])))
  const [callTime, setCallTime] = useState<string>('mornings')
  const [consent, setConsent] = useState(false) // UK GDPR: consent can't be pre-ticked
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<IntroResponse | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, mounted])

  const shared = [
    plan.brand,
    plan.sector?.label ? `${plan.sector.label} franchise` : null,
    plan.area?.label,
    plan.budget ? `~${formatBudget(plan.budget)} budget` : null,
    plan.stage ? `${STAGE_LABEL[plan.stage]} stage` : null,
  ].filter(Boolean) as string[]

  async function send() {
    if (!consent) { setError('Please confirm we can share your details.'); return }
    setSending(true); setError(null)
    try {
      const res = await requestIntros({
        partners: items.map(i => ({ id: i.id, need: needs[i.id] })),
        callTime, searchId, off,
      })
      setDone(res)
      onSent()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSending(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="intro-dialog-title"
        className="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-t-2xl bg-surface shadow-2xl outline-none sm:rounded-2xl">
        {done ? (
          <Sent res={done} items={items} onClose={onClose} />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 id="intro-dialog-title" className="text-lg font-extrabold text-ink">
                Request {items.length} {items.length === 1 ? 'intro' : 'intros'}
              </h2>
              <button type="button" onClick={onClose} aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-ink-3 hover:bg-surface-2">×</button>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div className="space-y-3">
                {items.map(i => (
                  <div key={i.id} className="rounded-xl border border-line p-3.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Monogram name={i.name} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-ink">{i.name}</div>
                        <div className="text-xs text-ink-3">{i.categoryLabel}</div>
                      </div>
                      {i.deal && <span className="basis-full rounded-md border border-dashed border-ff-gold px-2 py-1 text-[11px] font-semibold text-[#8a5f26] sm:basis-auto">{i.deal}</span>}
                    </div>
                    <label className="mt-3 block text-xs font-semibold text-ink-2">
                      What do you need from them?
                      <textarea
                        rows={2}
                        value={needs[i.id] ?? ''}
                        onChange={e => setNeeds(n => ({ ...n, [i.id]: e.target.value }))}
                        maxLength={1000}
                        className="mt-1.5 w-full resize-none rounded-lg border border-line px-3 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-ff-green"
                      />
                    </label>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs font-semibold text-ink-2">What we’ll share with them</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-ink-2 border border-line">Your name and contact details</span>
                  {shared.map(s => <span key={s} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-ink-2 border border-line">{s}</span>)}
                </div>
              </div>

              <fieldset>
                <legend className="text-xs font-semibold text-ink-2">Best time for a call</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CALL_TIMES.map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setCallTime(v)} aria-pressed={callTime === v}
                      className={cn('min-h-[40px] rounded-lg border px-4 text-sm font-medium',
                        callTime === v ? 'border-ff-green bg-ff-green text-white' : 'border-line bg-surface text-ink hover:bg-surface-2')}>
                      {l}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="flex items-start gap-3 text-sm text-ink-2">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 h-[18px] w-[18px] accent-[#3a4a3a]" />
                Share my details with {items.length === 1 ? 'this partner' : `these ${items.length} partners`} so they can contact me. I can withdraw at any time.
              </label>

              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <button type="button" onClick={send} disabled={sending}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-ff-gold text-base font-bold text-ink transition hover:brightness-105 disabled:opacity-60">
                {sending ? 'Sending…' : 'Send requests →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

function Sent({ res, items, onClose }: { res: IntroResponse; items: ListItem[]; onClose: () => void }) {
  const by = briefByLabel(res.briefBy)
  const name = (id: string) => items.find(i => i.id === id)?.name ?? 'Partner'
  return (
    <div className="px-6 py-7">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ff-ok-bg)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ff-ok)" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5L19 8" /></svg>
      </div>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
        {res.created.length ? 'Requests sent' : 'Already on it'}<Accent>.</Accent>
      </h2>
      {res.created.length > 0 && (
        <p className="mt-2 text-sm text-ink-2">
          We’ll brief {res.created.length === 1 ? 'them' : res.created.length === 2 ? 'both' : `all ${res.created.length}`}{by ? ` by ${by}` : ' today'}. Expect contact within a working day after that.
        </p>
      )}
      <div className="mt-5 space-y-3">
        {res.created.map(c => (
          <div key={c.requestId} className="rounded-xl border border-line p-3.5">
            <div className="text-sm font-bold text-ink">{c.name ?? name(c.partnerId)}</div>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              {STEPS.map((s, i) => (
                <div key={s}>
                  <div className={cn('h-1.5 rounded-full', i === 0 ? 'bg-ff-green' : 'bg-line')} />
                  <div className={cn('mt-1.5 text-[11px]', i === 0 ? 'font-semibold text-ink' : 'text-ink-3')}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {res.skipped.map(s => (
          <p key={s.partnerId} className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-2">
            {s.reason === 'already_open'
              ? `You already have an open intro with ${s.name ?? name(s.partnerId)}, so we haven’t sent another.`
              : `${s.name ?? name(s.partnerId)} isn’t taking intros right now.`}
          </p>
        ))}
      </div>
      <p className="mt-5 text-[13px] text-ink-3">We’ll update you in the portal and by email at every step.</p>
      <button type="button" onClick={onClose}
        className="mt-5 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ff-green text-sm font-bold text-white hover:brightness-110">
        Done
      </button>
    </div>
  )
}
