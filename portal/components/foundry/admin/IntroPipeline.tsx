'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import type { PipelineCard, PipelineView } from '@/lib/foundry/pipeline'
import { chaseTemplate } from '@/lib/foundry/brief'
import { RATINGS } from '@/lib/foundry/intro-status'
import { PartnerContacts, type Contact } from './PartnerContacts'

export interface PartnerOption { id: string; name: string; category: string | null; isDemo: boolean }

const COLUMNS = [
  { key: 'to_source', label: 'To source' },
  { key: 'to_brief', label: 'To brief' },
  { key: 'briefed', label: 'Briefed' },
  { key: 'in_contact', label: 'In contact' },
  { key: 'outcome', label: 'Outcome' },
] as const

const STAGE_LABEL: Record<string, string> = {
  to_source: 'To source', to_brief: 'To brief', briefed: 'Briefed', in_contact: 'In contact', outcome: 'Outcome',
  closed: 'Closed', withdrawn: 'Withdrawn', expired: 'Expired', awaiting_verification: 'Awaiting email',
}

function age(iso: string, now: number) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m`
  const h = Math.round(mins / 60)
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`
}

function due(iso: string | null, now: number) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - now
  const when = new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
  if (ms < 0) return { text: `Overdue by ${age(new Date(now + ms).toISOString(), now)}`, late: true }
  return { text: `Due ${when}`, late: false }
}

export function IntroPipeline({ cards, view, senderName, monthCount, unconfirmedCount, partners, serverNow }: {
  cards: PipelineCard[]; view: PipelineView; senderName: string; monthCount: number; unconfirmedCount: number; partners: PartnerOption[]; serverNow: number
}) {
  // Ages render from the server's clock first (no hydration mismatch), then tick each minute.
  const [now, setNow] = useState(serverNow)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  const [selId, setSelId] = useState<string | null>(cards[0]?.id ?? null)
  useEffect(() => { if (!cards.some(c => c.id === selId)) setSelId(cards[0]?.id ?? null) }, [cards, selId])
  const sel = cards.find(c => c.id === selId) ?? null
  const overdue = cards.filter(c => c.overdue).length
  const toBrief = cards.filter(c => c.stage === 'to_brief').length
  const toSource = cards.filter(c => c.stage === 'to_source').length
  const tab = (on: boolean) => cn('rounded-lg px-4 py-2 text-sm font-medium', on ? 'bg-ff-green text-white' : 'text-ink-2 hover:text-ink')

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
          <Link href="/admin/intro-requests" className={tab(view === 'open')}>Open</Link>
          <Link href="/admin/intro-requests?view=unconfirmed" className={tab(view === 'unconfirmed')}>
            Awaiting confirmation{unconfirmedCount > 0 && <span className="ml-1.5 font-mono text-xs opacity-80">{unconfirmedCount}</span>}
          </Link>
          <Link href="/admin/intro-requests?view=closed" className={tab(view === 'closed')}>Closed</Link>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-ink-2">
          <span><b className={cn('font-mono', overdue ? 'text-[var(--ff-crit)]' : 'text-ink')}>{overdue}</b> overdue</span>
          {toSource > 0 && <span><b className="font-mono text-[#8a5f26]">{toSource}</b> to source</span>}
          <span><b className="font-mono text-ink">{toBrief}</b> to brief</span>
          <span><b className="font-mono text-ink">{monthCount}</b> this month</span>
          <span className="text-ink-3">Brief within 4 working hours · chase at 24h</span>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface py-16 text-center text-sm text-ink-3">
          {view === 'open' ? 'No open intro requests.' : view === 'unconfirmed' ? 'No unconfirmed website requests.' : 'Nothing closed yet.'}
        </div>
      ) : (
        <>
        {view === 'unconfirmed' && (
          <p className="mb-3 text-sm text-ink-2">Website requests where the person hasn’t clicked the confirm link yet. Nothing has been shared with partners. They expire after 7 days.</p>
        )}
        <div className="grid items-start gap-5 xl:grid-cols-[1fr_420px]">
          {view === 'open' ? (
            <div className="overflow-x-auto pb-1">
              <div className="grid min-w-[940px] grid-cols-5 gap-3">
                {COLUMNS.map(col => {
                  const items = cards.filter(c => c.stage === col.key)
                  return (
                    <section key={col.key} aria-label={col.label}>
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">{col.label}</span>
                        <span className="font-mono text-xs text-ink-3">{items.length}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {items.map(c => <CardButton key={c.id} c={c} now={now} on={c.id === selId} onPick={() => setSelId(c.id)} />)}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cards.map(c => <CardButton key={c.id} c={c} now={now} on={c.id === selId} onPick={() => setSelId(c.id)} wide />)}
            </div>
          )}
          {sel && <Detail key={`${sel.id}:${sel.partner.id}:${sel.stage}`} c={sel} senderName={senderName} now={now} partners={partners} />}
        </div>
        </>
      )}
    </div>
  )
}

function CardButton({ c, on, onPick, wide, now }: { c: PipelineCard; on: boolean; onPick: () => void; wide?: boolean; now: number }) {
  return (
    <button type="button" onClick={onPick} aria-pressed={on}
      className={cn('w-full rounded-xl border bg-surface p-3 text-left transition-colors hover:border-ff-green',
        on ? 'border-ff-green ring-1 ring-ff-green' : c.overdue ? 'border-[#e7b9b1]' : 'border-line')}>
      <span className="flex items-baseline justify-between gap-2">
        <b className="truncate text-sm text-ink">{c.member.name}</b>
        <span className={cn('flex-shrink-0 font-mono text-[11px]', c.overdue ? 'font-semibold text-[var(--ff-crit)]' : 'text-ink-3')}>{age(c.stageSince, now)}</span>
      </span>
      {c.partner.id
        ? <span className="mt-0.5 block truncate text-xs font-semibold text-ff-green">→ {c.partner.name}</span>
        : <span className="mt-0.5 block truncate text-xs font-semibold text-[#8a5f26]">? {c.partner.name}{c.sourcing?.area ? ` · ${c.sourcing.area}` : ''}</span>}
      {c.need && <span className="mt-1 block text-xs text-ink-2 line-clamp-2">{c.need}</span>}
      <span className="mt-1.5 flex flex-wrap gap-1">
        {wide && <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-2">{STAGE_LABEL[c.stage]}</span>}
        {c.isDemo && <span className="rounded-full border border-dashed border-ff-gold px-2 py-0.5 text-[10px] font-semibold text-[#8a5f26]">Demo</span>}
        {c.source !== 'portal' && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-ink-2">{c.source}</span>}
        {c.rating && c.rating !== 'going_well' && <span className="rounded-full bg-[var(--ff-crit-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ff-crit)]">{RATINGS.find(([k]) => k === c.rating)?.[1]}</span>}
      </span>
    </button>
  )
}

function AssignPartner({ c, partners, busy, onAssign, onCancel }: {
  c: PipelineCard; partners: PartnerOption[]; busy: string | null; onAssign: (id: string) => void; onCancel?: () => void
}) {
  const want = c.sourcing?.category ?? null
  const pool = partners.filter(p => p.id !== c.partner.id && (c.isDemo || !p.isDemo))
  const fits = want ? pool.filter(p => p.category === want) : []
  const rest = pool.filter(p => !fits.includes(p))
  const [pick, setPick] = useState(fits[0]?.id ?? '')
  return (
    <div className="border-t border-line pt-4">
      <label className="block">
        <span className="font-mono text-[11px] tracking-[0.08em] text-ink-3">{c.partner.id ? 'SWAP PARTNER' : 'ASSIGN A PARTNER'}</span>
        <select value={pick} onChange={e => setPick(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ff-green">
          <option value="">Choose a partner…</option>
          {fits.length > 0 && <optgroup label={`${c.sourcing?.categoryLabel ?? 'Matching'} partners`}>{fits.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDemo ? ' (demo)' : ''}</option>)}</optgroup>}
          <optgroup label={fits.length ? 'Everyone else' : 'Live partners'}>{rest.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDemo ? ' (demo)' : ''}</option>)}</optgroup>
        </select>
      </label>
      {want && fits.length === 0 && <p className="mt-1.5 text-xs text-[#8a5f26]">No live {c.sourcing?.categoryLabel.toLowerCase()} partners yet. Add one under Partners, or pick another.</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={!pick || !!busy} onClick={() => onAssign(pick)}
          className="min-h-[44px] flex-1 rounded-xl bg-ff-green px-4 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50">
          {busy === 'assign' ? 'Saving…' : c.partner.id ? 'Swap + redraft briefing' : 'Assign + tell them'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-3 text-sm text-ink-2">Cancel</button>}
      </div>
    </div>
  )
}

function Detail({ c, senderName, now, partners }: { c: PipelineCard; senderName: string; now: number; partners: PartnerOption[] }) {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>(c.contacts)
  const primary = contacts.find(x => x.is_primary && x.email) ?? contacts.find(x => x.email)
  const [to, setTo] = useState(primary?.email ?? '')
  const [brief, setBrief] = useState(c.briefSent ?? c.briefDraft)
  const [chasing, setChasing] = useState(false)
  const [chase, setChase] = useState(() => chaseTemplate({ partnerName: c.partner.name, contactName: primary?.name ?? null, memberName: c.member.name, senderName }))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [showContacts, setShowContacts] = useState(contacts.length === 0)
  const d = c.stage === 'to_brief' || c.stage === 'briefed' ? due(c.slaDueAt, now) : null
  const open = ['awaiting_verification', 'to_source', 'to_brief', 'briefed', 'in_contact', 'outcome'].includes(c.stage)
  const [swapping, setSwapping] = useState(c.stage === 'to_source')

  useEffect(() => { if (!to && primary?.email) setTo(primary.email) }, [primary?.email, to])

  const tags = useMemo(() => [
    c.context.role ? (c.context.role === 'franchisor' ? 'Franchisor' : c.context.role === 'admin' ? 'Admin' : 'Franchisee') : null,
    c.context.brand, c.context.sector, c.context.area, c.context.budget, c.context.stage,
  ].filter(Boolean) as string[], [c.context])

  async function act(action: string, extra: Record<string, unknown> = {}, ok = 'Done.') {
    setBusy(action)
    const res = await fetch(`/api/admin/foundry/intros/${c.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }),
    })
    const data = await res.json().catch(() => null)
    setBusy(null)
    if (!res.ok) { toast(data?.error ?? 'Something went wrong.', 'error'); return false }
    toast(ok); router.refresh(); return true
  }

  const btn = 'min-h-[44px] rounded-xl px-4 text-sm font-bold transition disabled:opacity-50'

  return (
    <aside className="space-y-4 xl:sticky xl:top-4" aria-label="Intro detail">
      <div className="rounded-2xl bg-ff-green p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tracking-[0.08em] text-[#e8c9a0]">
          <span>{STAGE_LABEL[c.stage].toUpperCase()} · {age(c.stageSince, now)} OLD</span>
          {d && <span className={cn(d.late && 'rounded bg-[var(--ff-crit)] px-1.5 py-0.5 text-white')}>{d.text}</span>}
        </div>
        <div className="mt-2 text-lg font-extrabold">{c.member.name} → {c.partner.name}</div>
        <div className="mt-1 text-xs text-white/75">{[c.member.email, c.member.phone].filter(Boolean).join(' · ')}</div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map(t => <span key={t} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">{t}</span>)}
            {c.callTime && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">Calls: {c.callTime}</span>}
          </div>
        )}
        {c.isDemo && <div className="mt-3 rounded-lg border border-dashed border-[#e8c9a0] px-2.5 py-1.5 text-xs text-[#e8c9a0]">Demo intro: partner emails go to the preview list, not the partner.</div>}
      </div>

      <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <div>
          <div className="font-mono text-[11px] tracking-[0.08em] text-ink-3">{c.sourcing ? 'THEY ASKED US TO FIND' : 'THEIR MESSAGE'}</div>
          <p className="mt-1 text-sm text-ink">{c.need ? `“${c.need}”` : 'No message.'}</p>
        </div>

        {c.member.contactId && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
            <span className="text-ink-2">Website contact{c.member.id ? ', now a portal member' : ''}</span>
            {c.member.leadId
              ? <Link href={`/admin/leads/${c.member.leadId}`} className="font-semibold text-ff-green hover:underline">In Leads ✓</Link>
              : <button type="button" disabled={!!busy} onClick={() => act('convert_lead', {}, 'Added to Leads.')}
                  className="min-h-[36px] rounded-lg border border-ff-green px-3 text-xs font-bold text-ff-green hover:bg-surface disabled:opacity-50">
                  {busy === 'convert_lead' ? 'Adding…' : 'Add to Leads'}
                </button>}
          </div>
        )}

        {c.stage === 'awaiting_verification' && (
          <div className="border-t border-line pt-4">
            <p className="text-sm text-ink-2">They haven’t confirmed their email yet{c.member.email ? <> (<b className="text-ink">{c.member.email}</b>)</> : ''}. Sent {age(c.createdAt, now)} ago.</p>
            <button type="button" disabled={!!busy || !c.member.email} onClick={() => act('resend_verify', {}, 'Confirmation email resent.')}
              className={cn(btn, 'mt-2 w-full bg-ff-green text-white hover:brightness-110')}>{busy === 'resend_verify' ? 'Sending…' : 'Resend confirmation'}</button>
          </div>
        )}

        {(c.stage === 'to_source' || c.stage === 'to_brief' || c.stage === 'briefed') && (
          swapping
            ? <AssignPartner c={c} partners={partners} busy={busy} onCancel={c.stage === 'to_source' ? undefined : () => setSwapping(false)}
                onAssign={async id => { const name = partners.find(p => p.id === id)?.name ?? 'Partner'; if (await act('assign', { partnerId: id }, c.stage === 'to_source' ? `${name} assigned. Member told, now in To brief.` : `Swapped to ${name}. Briefing redrafted.`)) setSwapping(false) }} />
            : <button type="button" onClick={() => setSwapping(true)} className="text-xs font-semibold text-ff-green hover:underline">
                Change partner{c.stage === 'briefed' ? ' (already briefed)' : ''}
              </button>
        )}

        {(c.stage === 'to_brief' || c.stage === 'briefed') && (
          <div className="border-t border-line pt-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-[0.08em] text-ink-3">WHO WE BRIEF</span>
              <button type="button" onClick={() => setShowContacts(s => !s)} className="text-xs text-ff-green hover:underline">{showContacts ? 'Hide' : 'Manage contacts'}</button>
            </div>
            {showContacts && <div className="mt-2"><PartnerContacts partnerId={c.partner.id} initial={contacts} onChange={setContacts} compact /></div>}
            <label className="mt-2 block text-xs text-ink-2">Send to
              <input type="email" list={`contacts-${c.id}`} value={to} onChange={e => setTo(e.target.value)} placeholder="partner@example.com"
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ff-green" />
              <datalist id={`contacts-${c.id}`}>{contacts.filter(x => x.email).map(x => <option key={x.id} value={x.email!}>{x.name}</option>)}</datalist>
            </label>
          </div>
        )}

        {c.stage === 'to_brief' && (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] tracking-[0.08em] text-ink-3">BRIEFING EMAIL</span>
              <span className="text-[11px] text-ink-3">Template · edit before sending</span>
            </div>
            <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={12}
              className="mt-1.5 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-ff-green" />
            <button type="button" disabled={!!busy || !to} onClick={() => act('brief', { to, body: brief }, 'Briefing sent. Member updated.')}
              className={cn(btn, 'mt-2 w-full bg-ff-green text-white hover:brightness-110')}>
              {busy === 'brief' ? 'Sending…' : 'Send briefing + mark briefed'}
            </button>
          </div>
        )}

        {c.stage === 'briefed' && (
          <div className="space-y-2">
            <button type="button" disabled={!!busy} onClick={() => act('contacted', {}, 'Marked as in contact. Member can now see their details.')}
              className={cn(btn, 'w-full bg-ff-green text-white hover:brightness-110')}>{busy === 'contacted' ? 'Saving…' : 'Mark: partner made contact'}</button>
            {chasing ? (
              <div>
                <textarea value={chase} onChange={e => setChase(e.target.value)} rows={7}
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-ink focus:outline-none focus:ring-2 focus:ring-ff-green" />
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={!!busy || !to} onClick={async () => { if (await act('chase', { to, body: chase }, 'Chase sent.')) setChasing(false) }}
                    className={cn(btn, 'flex-1 border border-ff-green text-ff-green hover:bg-surface-2')}>{busy === 'chase' ? 'Sending…' : 'Send chase'}</button>
                  <button type="button" onClick={() => setChasing(false)} className="px-3 text-sm text-ink-2">Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setChasing(true)} className={cn(btn, 'w-full border border-line text-ink hover:bg-surface-2')}>
                Chase{c.chasedAt ? ` again (last ${age(c.chasedAt, now)} ago)` : ''}
              </button>
            )}
            {c.briefSent && <details className="text-xs text-ink-2"><summary className="cursor-pointer">Briefing we sent</summary><pre className="mt-1 whitespace-pre-wrap font-mono">{c.briefSent}</pre></details>}
          </div>
        )}

        {c.stage === 'in_contact' && (
          <button type="button" disabled={!!busy} onClick={() => act('ask_outcome', {}, 'Asked the member how it went.')}
            className={cn(btn, 'w-full bg-ff-green text-white hover:brightness-110')}>{busy === 'ask_outcome' ? 'Saving…' : 'Ask member for outcome'}</button>
        )}

        {(c.stage === 'in_contact' || c.stage === 'outcome') && (
          <div>
            {c.rating && <p className="mb-2 text-sm text-ink-2">Member says: <b className="text-ink">{RATINGS.find(([k]) => k === c.rating)?.[1]}</b></p>}
            <div className="font-mono text-[11px] tracking-[0.08em] text-ink-3">CLOSE AS</div>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              <button type="button" disabled={!!busy} onClick={() => act('close', { outcome: 'hired' }, 'Closed: they went ahead.')} className={cn(btn, 'border border-line px-2 text-xs text-ink hover:bg-surface-2')}>Went ahead</button>
              <button type="button" disabled={!!busy} onClick={() => act('close', { outcome: 'not_hired' }, 'Closed: not taken forward.')} className={cn(btn, 'border border-line px-2 text-xs text-ink hover:bg-surface-2')}>Not taken forward</button>
              <button type="button" disabled={!!busy} onClick={() => act('close', { outcome: 'undecided' }, 'Closed.')} className={cn(btn, 'border border-line px-2 text-xs text-ink hover:bg-surface-2')}>Just close</button>
            </div>
          </div>
        )}

        {open && (
          <div className="border-t border-line pt-4">
            <label htmlFor={`note-${c.id}`} className="font-mono text-[11px] tracking-[0.08em] text-ink-3">INTERNAL NOTE</label>
            <div className="mt-1.5 flex gap-2">
              <input id={`note-${c.id}`} value={note} onChange={e => setNote(e.target.value)} placeholder="Only the team sees this"
                className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ff-green" />
              <button type="button" disabled={!note.trim() || !!busy} onClick={async () => { if (await act('note', { body: note }, 'Note added.')) setNote('') }}
                className="min-h-[40px] rounded-lg border border-line px-3 text-sm font-semibold text-ink disabled:opacity-50">Add</button>
            </div>
          </div>
        )}

        <div className="border-t border-line pt-4">
          <div className="font-mono text-[11px] tracking-[0.08em] text-ink-3">TIMELINE</div>
          <ol className="mt-2 space-y-2.5">
            {c.events.map(e => (
              <li key={e.id} className="flex gap-2.5 text-sm">
                <span aria-hidden="true" className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', e.visible ? 'bg-ff-green' : 'bg-line')} />
                <span>
                  <span className="text-ink">{e.body}</span>
                  <span className="block text-[11px] text-ink-3">
                    {new Date(e.at).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {!e.visible && ' · internal'}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-ink-3">Green dots are what the member sees in My intros.</p>
        </div>
      </div>
    </aside>
  )
}
