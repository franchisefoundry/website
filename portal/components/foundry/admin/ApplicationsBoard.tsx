'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { CHECKS, TRUST_LEVELS } from '@/lib/foundry/applications-shared'
import type { ApplicationCard } from '@/lib/foundry/applications'

function ago(iso: string, now: number) {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  return `${Math.round(days / 7)} weeks ago`
}

function statusLine(a: ApplicationCard) {
  if (a.status === 'approved') return { text: a.partner?.status === 'live' ? 'Live · approved' : 'Approved · profile in draft', tone: 'text-[var(--ff-ok,#2f7a4a)]' }
  if (a.status === 'declined') return { text: 'Declined', tone: 'text-ink-3' }
  const n = CHECKS.filter(c => a.checks[c.k]).length
  return { text: n === 0 ? 'New · not started' : `${n} of ${CHECKS.length} checks done`, tone: 'text-[#8a5f26]' }
}

export function ApplicationsBoard({ apps, view, initialId, declineDrafts, serverNow }: {
  apps: ApplicationCard[]; view: 'open' | 'decided'; initialId: string | null; declineDrafts: Record<string, string>; serverNow: number
}) {
  const [selId, setSelId] = useState<string | null>(apps.find(a => a.id === initialId)?.id ?? apps[0]?.id ?? null)
  useEffect(() => { if (!apps.some(a => a.id === selId)) setSelId(apps[0]?.id ?? null) }, [apps, selId])
  const sel = apps.find(a => a.id === selId) ?? null
  const tab = (on: boolean) => cn('rounded-lg px-4 py-2 text-sm font-medium', on ? 'bg-ff-green text-white' : 'text-ink-2 hover:text-ink')

  return (
    <div>
      <div className="mb-4 inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
        <Link href="/admin/foundry/applications" className={tab(view === 'open')}>To review</Link>
        <Link href="/admin/foundry/applications?view=decided" className={tab(view === 'decided')}>Decided</Link>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center text-sm text-ink-3">
          {view === 'open' ? <>No applications waiting. They come in from <span className="font-mono">/foundry/apply.html</span> on the website.</> : 'Nothing decided yet.'}
        </div>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="flex flex-col gap-2">
            {sel?.gap && view === 'open' && (
              <div className="rounded-xl border border-ff-gold bg-[var(--ff-gold-soft)] px-4 py-3 text-sm text-[#6b4a1d]">
                <b>Gap to fill:</b> {sel.gap.searches} {sel.gap.searches === 1 ? 'search' : 'searches'} for {sel.categoryLabel.toLowerCase()}{sel.gap.area ? ` in ${sel.gap.area}` : ''} we couldn’t answer this month.{' '}
                <Link href="/admin/foundry/insights" className="font-semibold underline">See insights</Link>
              </div>
            )}
            {apps.map(a => {
              const s = statusLine(a)
              const on = a.id === selId
              return (
                <button key={a.id} type="button" onClick={() => setSelId(a.id)} aria-pressed={on}
                  className={cn('w-full rounded-xl border bg-surface p-4 text-left transition-colors hover:border-ff-green', on ? 'border-ff-green ring-1 ring-ff-green' : 'border-line')}>
                  <span className="flex items-baseline justify-between gap-3">
                    <b className="truncate text-ink">{a.company}</b>
                    <span className="flex-shrink-0 text-xs text-ink-3">{ago(a.createdAt, serverNow)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-2">{a.categoryLabel} · {a.regionLabel}{a.clients != null ? ` · ${a.clients} franchise clients` : ''}</span>
                  <span className="mt-2 flex items-center gap-3">
                    <span className="flex gap-1" aria-hidden="true">
                      {CHECKS.map(c => <i key={c.k} className={cn('h-1.5 w-6 rounded-full', a.status === 'approved' || a.checks[c.k] ? 'bg-ff-green' : 'bg-line')} />)}
                    </span>
                    <span className={cn('text-xs font-semibold', s.tone)}>{s.text}</span>
                    {a.isDemo && <span className="rounded-full border border-dashed border-ff-gold px-2 py-0.5 text-[10px] font-semibold text-[#8a5f26]">Demo</span>}
                  </span>
                </button>
              )
            })}
          </div>
          {sel && <Detail key={sel.id + sel.status} a={sel} declineDraft={declineDrafts[sel.id] ?? ''} now={serverNow} />}
        </div>
      )}
    </div>
  )
}

function Detail({ a, declineDraft, now }: { a: ApplicationCard; declineDraft: string; now: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [checks, setChecks] = useState(a.checks)
  const [refs, setRefs] = useState(a.referencesCalled)
  const [trust, setTrust] = useState(a.trust)
  const [notes, setNotes] = useState(a.notes ?? '')
  const [declining, setDeclining] = useState(false)
  const [decline, setDecline] = useState(declineDraft)
  const [sendDecline, setSendDecline] = useState(true)
  const open = a.status === 'new' || a.status === 'vetting'
  const done = CHECKS.filter(c => checks[c.k]).length
  const all = done === CHECKS.length

  async function act(action: string, extra: Record<string, unknown> = {}, ok?: string, refresh = true) {
    setBusy(action)
    const res = await fetch(`/api/admin/foundry/applications/${a.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }),
    })
    const data = await res.json().catch(() => null)
    setBusy(null)
    if (!res.ok) { toast(data?.error ?? 'Something went wrong.', 'error'); return null }
    if (ok) toast(ok)
    if (refresh) router.refresh()
    return data
  }

  async function toggle(k: string) {
    const on = !checks[k as keyof typeof checks]
    setChecks(c => ({ ...c, [k]: on }))
    if (k === 'ref') setRefs(on ? 3 : Math.min(refs, 2))
    const r = await act(k === 'ref' ? 'refs' : 'check', k === 'ref' ? { called: on ? 3 : Math.min(refs, 2) } : { key: k, on }, undefined, false)
    if (!r) setChecks(c => ({ ...c, [k]: !on }))
  }

  async function setCalled(n: number) {
    setRefs(n); setChecks(c => ({ ...c, ref: n >= 3 }))
    await act('refs', { called: n }, undefined, false)
  }

  const label = 'font-mono text-[11px] tracking-[0.08em] text-ink-3'
  const btn = 'min-h-[44px] rounded-xl px-4 text-sm font-bold transition disabled:opacity-50'

  return (
    <aside className="space-y-4 xl:sticky xl:top-4" aria-label={`${a.company} application`}>
      <div className="rounded-2xl bg-ff-green p-5 text-white">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-extrabold">{a.company.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold">{a.company}</div>
            <div className="text-xs text-white/75">{a.categoryLabel} · {a.regionLabel} · applied {ago(a.createdAt, now)}</div>
          </div>
          {a.website && <a href={a.website} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-xs font-semibold text-[#e8c9a0] hover:underline">Website ↗</a>}
        </div>
        <div className="mt-3 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm">
          <b>{a.contact.name}</b>{a.contact.role ? `, ${a.contact.role}` : ''}
          <div className="text-white/80"><a href={`mailto:${a.contact.email}`} className="hover:underline">{a.contact.email}</a>{a.contact.phone ? ` · ${a.contact.phone}` : ''}</div>
        </div>
        {a.isDemo && <div className="mt-3 rounded-lg border border-dashed border-[#e8c9a0] px-2.5 py-1.5 text-xs text-[#e8c9a0]">Demo application.</div>}
      </div>

      <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><dt className={label}>COMPANIES HOUSE</dt><dd className="text-ink">{a.companiesHouse
            ? <a className="text-ff-green hover:underline" target="_blank" rel="noopener noreferrer" href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(a.companiesHouse)}`}>{a.companiesHouse} ↗</a>
            : <span className="text-ink-3">Not given</span>}</dd></div>
          <div><dt className={label}>REGULATOR</dt><dd className="text-ink">{a.regulator ?? <span className="text-ink-3">None given</span>}</dd></div>
          <div><dt className={label}>FRANCHISE CLIENTS (2 YRS)</dt><dd className="text-ink">{a.clients ?? '–'}</dd></div>
          <div><dt className={label}>INSURANCE</dt><dd>{a.insuranceUrl
            ? <a href={a.insuranceUrl} target="_blank" rel="noopener noreferrer" className="text-ff-green hover:underline">View certificate ↗</a>
            : <span className="text-ink-3">Not uploaded</span>}</dd></div>
        </dl>

        <div>
          <div className={label}>REFERENCES</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{a.references ?? 'None given.'}</p>
        </div>

        <div className="border-t border-line pt-4">
          <div className="flex items-baseline justify-between">
            <span className={label}>VETTING CHECKLIST</span>
            <span className="font-mono text-xs text-ink-3">{a.status === 'approved' ? 'done' : `${done}/${CHECKS.length}`}</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {CHECKS.map(c => {
              const on = a.status === 'approved' || !!checks[c.k]
              return (
                <li key={c.k}>
                  <button type="button" disabled={!open} onClick={() => toggle(c.k)} aria-pressed={on}
                    className="flex w-full items-start gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-surface-2 disabled:hover:bg-transparent">
                    <span aria-hidden="true" className={cn('mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border text-xs font-bold',
                      on ? 'border-ff-green bg-ff-green text-white' : 'border-[#c9d0ca] bg-surface')}>{on ? '✓' : ''}</span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">{c.t}</span>
                      <span className="block text-xs text-ink-2">{c.k === 'ref' ? `${refs} of 3 called` : c.d}</span>
                    </span>
                  </button>
                  {c.k === 'ref' && open && !on && (
                    <div className="ml-9 mt-1 flex gap-1">
                      {[0, 1, 2, 3].map(n => (
                        <button key={n} type="button" onClick={() => setCalled(n)} aria-pressed={refs === n}
                          className={cn('h-7 w-8 rounded-md border text-xs font-semibold', refs === n ? 'border-ff-green bg-ff-green text-white' : 'border-line text-ink-2')}>{n}</button>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {a.deal && (
          <div className="border-t border-line pt-4">
            <div className={label}>PROPOSED MEMBER DEAL</div>
            <p className="mt-1 text-sm font-semibold text-[#8a5f26]">{a.deal}</p>
          </div>
        )}

        <div className="border-t border-line pt-4">
          <div className={label}>SET TRUST LEVEL</div>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {TRUST_LEVELS.map(([k, l]) => (
              <button key={k} type="button" aria-pressed={trust === k}
                onClick={async () => { const prev = trust; setTrust(k); if (!await act('trust', { level: k }, undefined, false)) setTrust(prev) }}
                className={cn('min-h-[40px] rounded-lg border text-sm font-semibold', trust === k ? 'border-ff-green bg-ff-green text-white' : 'border-line text-ink hover:bg-surface-2')}>{l}</button>
            ))}
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <label htmlFor={`notes-${a.id}`} className={label}>NOTES (INTERNAL)</label>
          <textarea id={`notes-${a.id}`} value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            onBlur={() => { if (notes !== (a.notes ?? '')) act('notes', { body: notes }, 'Notes saved.', false) }}
            placeholder="Only the team sees this"
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ff-green" />
        </div>

        {open && !declining && (
          <div className="space-y-2 border-t border-line pt-4">
            <button type="button" disabled={!!busy}
              onClick={async () => { const r = await act('approve', {}, undefined, false); if (r?.partnerId) { toast(`${a.company} approved. Build their profile, then go live.`); router.push(`/admin/foundry/partners/${r.partnerId}`) } }}
              className={cn(btn, 'w-full', all ? 'bg-ff-green text-white hover:brightness-110' : 'border border-ff-green text-ff-green hover:bg-surface-2')}>
              {busy === 'approve' ? 'Approving…' : all ? 'Approve and build profile' : `Approve anyway (${done}/${CHECKS.length} checks)`}
            </button>
            <p className="text-xs text-ink-3">Creates a draft partner with them as the contact we brief, and opens the editor so you can write their profile and go live.</p>
            <button type="button" onClick={() => setDeclining(true)} className={cn(btn, 'w-full border border-line text-ink hover:bg-surface-2')}>Decline</button>
          </div>
        )}

        {open && declining && (
          <div className="space-y-2 border-t border-line pt-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={sendDecline} onChange={e => setSendDecline(e.target.checked)} /> Email them
            </label>
            {sendDecline && <textarea value={decline} onChange={e => setDecline(e.target.value)} rows={10}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-ff-green" />}
            <div className="flex gap-2">
              <button type="button" disabled={!!busy} onClick={() => act('decline', { message: sendDecline ? decline : null }, 'Declined.')}
                className={cn(btn, 'flex-1 bg-ink text-white hover:brightness-110')}>{busy === 'decline' ? 'Saving…' : sendDecline ? 'Decline + send' : 'Decline quietly'}</button>
              <button type="button" onClick={() => setDeclining(false)} className="px-3 text-sm text-ink-2">Cancel</button>
            </div>
          </div>
        )}

        {a.status === 'approved' && a.partner && (
          <div className="border-t border-line pt-4 text-sm">
            <Link href={`/admin/foundry/partners/${a.partner.id}`} className="font-semibold text-ff-green hover:underline">
              {a.partner.status === 'live' ? 'Live in Partners →' : 'Finish their profile in Partners →'}
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
