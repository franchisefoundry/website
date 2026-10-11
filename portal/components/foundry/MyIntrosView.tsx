'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { MyIntro } from '@/lib/foundry/my-intros'
import { RATINGS, type Rating } from '@/lib/foundry/intro-status'
import { toast } from '@/lib/toast'
import { Monogram, Accent } from './bits'

const TONE: Record<MyIntro['status']['tone'], string> = {
  progress: 'text-[#8a5f26]',
  good: 'text-[var(--ff-ok)]',
  done: 'text-ink-2',
  muted: 'text-ink-3',
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' })
}
function whenLabel(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function MyIntrosView({ intros, base, canMessage }: { intros: MyIntro[]; base: string; canMessage: boolean }) {
  const [selId, setSelId] = useState(intros[0]?.id ?? null)
  const sel = intros.find(i => i.id === selId) ?? null

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">My intros<Accent>.</Accent></h1>
          <p className="mt-1 text-sm text-ink-2">Every partner we’ve introduced you to, and where it’s up to.</p>
        </div>
        <Link href={base} className="inline-flex min-h-[44px] items-center rounded-xl bg-ff-gold px-5 text-sm font-bold text-ink hover:brightness-105">+ New intro</Link>
      </div>

      {intros.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
          <p className="font-semibold text-ink">No intros yet.</p>
          <p className="mt-1 text-sm text-ink-2">Ask The Foundry for what you need and we’ll introduce you to someone we’d back.</p>
          <Link href={base} className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-ff-green px-5 text-sm font-bold text-white">Ask The Foundry →</Link>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="hidden grid-cols-[1.3fr_1fr_1fr] gap-4 border-b border-line px-5 py-3 font-mono text-[11px] tracking-[0.08em] text-ink-3 md:grid">
              <span>PARTNER</span><span>PROGRESS</span><span>NEXT</span>
            </div>
            <ul>
              {intros.map(i => {
                const on = i.id === selId
                return (
                  <li key={i.id} className="border-b border-line-2 last:border-b-0">
                    <button type="button" aria-pressed={on} onClick={() => {
                      setSelId(i.id)
                      // On phones the detail sits under the list: bring it into view.
                      if (window.matchMedia('(max-width: 1023px)').matches) {
                        setTimeout(() => document.getElementById('intro-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
                      }
                    }}
                      className={cn('grid w-full gap-3 border-l-[3px] px-5 py-4 text-left transition-colors md:grid-cols-[1.3fr_1fr_1fr] md:items-center md:gap-4',
                        on ? 'border-l-ff-green bg-surface-2' : 'border-l-transparent hover:bg-surface-2')}>
                      <span className="flex min-w-0 items-center gap-3">
                        <Monogram name={i.partner.name} />
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-ink">{i.partner.name}</span>
                          <span className="block text-xs text-ink-3">{i.partner.categoryLabel} · {dateLabel(i.createdAt)}</span>
                        </span>
                      </span>
                      <span>
                        <span className="flex gap-1" aria-hidden="true">
                          {[0, 1, 2, 3].map(s => <span key={s} className={cn('h-1.5 flex-1 rounded-full', s < i.status.step ? 'bg-ff-green' : 'bg-line')} />)}
                        </span>
                        <span className={cn('mt-1.5 block text-xs font-semibold', TONE[i.status.tone])}>{i.status.status}</span>
                      </span>
                      <span className="text-[13px] text-ink-2">{i.status.next}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {sel && <IntroDetail key={sel.id} intro={sel} base={base} canMessage={canMessage} />}
        </div>
      )}
    </div>
  )
}

function IntroDetail({ intro, base, canMessage }: { intro: MyIntro; base: string; canMessage: boolean }) {
  const router = useRouter()
  const [rating, setRating] = useState<Rating | null>(intro.rating)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)

  async function rate(r: Rating) {
    if (saving) return
    const prev = rating
    setRating(r); setSaving(true)
    const res = await fetch(`/api/foundry/intros/${intro.id}/rating`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: r }),
    })
    setSaving(false)
    if (!res.ok) { setRating(prev); toast('Could not save that. Try again.', 'error') }
    else toast('Thanks. Only we see this.')
  }

  async function send() {
    const text = msg.trim()
    if (!text) return
    setSending(true)
    const res = await fetch('/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: `Re: intro with ${intro.partner.name}\n\n${text}` }),
    })
    setSending(false)
    if (res.ok) { setMsg(''); toast('Sent. We’ll reply in your messages.') }
    else toast('Could not send. Try again.', 'error')
  }

  async function withdraw() {
    const res = await fetch(`/api/foundry/intros/${intro.id}/withdraw`, { method: 'POST' })
    if (res.ok) { toast('Intro withdrawn.'); router.refresh() }
    else toast((await res.json().catch(() => null))?.error ?? 'Could not withdraw.', 'error')
    setConfirmWithdraw(false)
  }

  const showRating = intro.status.step >= 3 || intro.stage === 'closed'

  return (
    <aside id="intro-detail" className="scroll-mt-20 space-y-4 lg:sticky lg:top-4" aria-label={`${intro.partner.name} intro`}>
      <div className="rounded-2xl bg-ff-green p-5 text-white">
        <div className="flex items-baseline justify-between gap-3">
          <Link href={`${base}/${intro.partner.slug}`} className="text-lg font-extrabold hover:underline">{intro.partner.name}</Link>
          <span className="text-xs text-[#e8c9a0]">{intro.status.status}</span>
        </div>
        {intro.contact ? (
          <div className="mt-3 rounded-xl bg-white/10 px-3.5 py-3 text-sm">
            <div className="font-semibold">Your contact: {intro.contact.name}{intro.contact.role ? `, ${intro.contact.role}` : ''}</div>
            <div className="mt-0.5 text-white/80">
              {[intro.contact.email, intro.contact.phone].filter(Boolean).map((c, i) => (
                <span key={c}>{i > 0 && ' · '}{c!.includes('@') ? <a href={`mailto:${c}`} className="underline">{c}</a> : <a href={`tel:${c!.replace(/\s/g, '')}`} className="underline">{c}</a>}</span>
              ))}
            </div>
          </div>
        ) : intro.status.open ? (
          <p className="mt-2 text-sm text-white/75">Their contact details appear here once they’ve reached out.</p>
        ) : null}
        {intro.need && <p className="mt-3 border-t border-white/15 pt-3 text-[13px] text-white/80">You asked for: “{intro.need}”</p>}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-mono text-[11px] tracking-[0.08em] text-ink-3">UPDATES</h2>
        <ol className="mt-3 space-y-3">
          {intro.events.map((e, i) => (
            <li key={e.id} className="flex gap-3">
              <span aria-hidden="true" className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', i === 0 ? 'bg-ff-gold' : 'bg-line')} />
              <div>
                <div className="text-sm text-ink">{e.body}</div>
                <div className="text-xs text-ink-3">{whenLabel(e.at)}</div>
              </div>
            </li>
          ))}
        </ol>

        {showRating && (
          <div className="mt-5 border-t border-line pt-4">
            <div className="text-sm font-bold text-ink">How’s it going?</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {RATINGS.map(([k, l]) => (
                <button key={k} type="button" onClick={() => rate(k)} aria-pressed={rating === k} disabled={saving}
                  className={cn('min-h-[40px] rounded-lg border px-3.5 text-sm font-medium transition-colors',
                    rating === k ? 'border-ff-green bg-ff-green text-white' : 'border-line bg-surface text-ink hover:bg-surface-2')}>
                  {l}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-3">Only we see this. It’s how we keep The Foundry honest.</p>
          </div>
        )}

        {canMessage && (
          <div className="mt-5 border-t border-line pt-4">
            <label htmlFor={`msg-${intro.id}`} className="text-sm font-bold text-ink">Message us</label>
            <textarea id={`msg-${intro.id}`} rows={2} value={msg} onChange={e => setMsg(e.target.value)} maxLength={2000}
              placeholder="Anything we should chase or know?"
              className="mt-2 w-full resize-none rounded-lg border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ff-green" />
            <button type="button" onClick={send} disabled={sending || !msg.trim()}
              className="mt-2 min-h-[40px] rounded-lg bg-ff-green px-4 text-sm font-bold text-white disabled:opacity-50">
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        )}

        {intro.status.open && intro.stage !== 'outcome' && (
          <div className="mt-5 border-t border-line pt-3 text-xs">
            {confirmWithdraw ? (
              <span className="flex flex-wrap items-center gap-3 text-ink-2">
                Withdraw and stop sharing your details with {intro.partner.name}?
                <button type="button" onClick={withdraw} className="min-h-[36px] font-bold text-red-700 hover:underline">Yes, withdraw</button>
                <button type="button" onClick={() => setConfirmWithdraw(false)} className="min-h-[36px] text-ink-2 hover:underline">Keep it</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmWithdraw(true)} className="min-h-[36px] text-ink-3 hover:text-ink hover:underline">Withdraw this intro</button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
