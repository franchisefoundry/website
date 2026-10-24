'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { createClient } from '@/lib/supabase/client'
import { NEEDS, NEED_LABEL, REGION_LABEL, SECTORS, type Need, type Region } from '@/lib/foundry/taxonomy'
import { parseQuery } from '@/lib/foundry/parse'
import { score } from '@/lib/foundry/rank'
import { slugify } from '@/lib/foundry/applications-shared'
import { liveGaps, profileGaps, parseMoney, type PartnerForm } from '@/lib/foundry/partner-input'
import type { EnginePartner } from '@/lib/foundry/types'
import { ResultCard } from '../ResultCard'
import { PartnerContacts, type Contact } from './PartnerContacts'

type Errors = Partial<Record<keyof PartnerForm, string>>

const REGIONS: [string, string][] = [['uk', 'UK-wide'], ...(Object.entries(REGION_LABEL) as [Region, string][])]
const TEST_DEFAULT: Record<string, string> = {
  funding: 'funding for a coffee franchise in Leeds, around £120k',
  property: 'shopfitter for a kiosk in Manchester',
  legal: 'solicitor to check my franchise agreement',
  accounting: 'accountant for a new franchisee in Birmingham',
  technology: 'EPOS for a coffee shop',
  insurance: 'insurance for a new coffee unit',
  marketing: 'launch marketing in Bristol',
  recruitment: 'hiring staff for a new site in London',
}

const input = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ff-green'
const label = 'block text-xs font-semibold text-ink-2'
const hint = 'font-normal text-ink-3'

export function PartnerEditor({ id, initial, contacts: initialContacts, isDemo }: {
  id: string | null; initial: PartnerForm; contacts: Contact[]; isDemo: boolean
}) {
  const router = useRouter()
  const [f, setF] = useState<PartnerForm>(initial)
  const [saved, setSaved] = useState<PartnerForm>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(!!id)
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [test, setTest] = useState(TEST_DEFAULT[initial.category] ?? 'funding for a coffee franchise in Leeds')
  const [testTouched, setTestTouched] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  const dirty = JSON.stringify(f) !== JSON.stringify(saved)

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  function set<K extends keyof PartnerForm>(k: K, v: PartnerForm[K]) {
    setF(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'name' && !slugTouched) next.slug = slugify(String(v))
      return next
    })
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }))
    if (k === 'category' && !testTouched) setTest(TEST_DEFAULT[String(v)] ?? test)
  }
  const toggle = (k: 'regions' | 'sectors', v: string) => {
    const cur = f[k]
    if (k === 'regions' && v === 'uk') return set('regions', cur.includes('uk') ? [] : ['uk'])
    const base = k === 'regions' ? cur.filter(x => x !== 'uk') : cur
    set(k, base.includes(v) ? base.filter(x => x !== v) : [...base, v])
  }

  // ── Live preview through the real ranking engine ───────────────────────
  const preview = useMemo(() => {
    if (!f.category) return null
    const money = (v: string) => { const m = parseMoney(v); return typeof m === 'number' ? m : null }
    const count = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : null)
    const p: EnginePartner = {
      id: id ?? 'preview', slug: f.slug || 'preview', name: f.name || 'Partner name', category: f.category,
      audience: f.audience, tagline: f.tagline || null, offer_text: f.offer_text || null, trust_level: f.trust_level,
      regions: f.regions, base_location: f.base_location || null, price_from: f.price_from || null,
      budget_min_gbp: money(f.budget_min_gbp), budget_max_gbp: money(f.budget_max_gbp), sectors: f.sectors,
      keywords: f.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean),
      client_count: count(f.client_count), reply_hours: count(f.reply_hours_typical),
    }
    const q = parseQuery(test)
    const scored = score(p, f.category, { sector: q.sector, area: q.area, budget: q.budget }, q.raw)
    const askedFor = q.needs.length ? q.needs.map(n => NEED_LABEL[n].toLowerCase()) : []
    return { scored, inQuery: q.needs.includes(f.category), askedFor, q }
  }, [f, test, id])

  const blocking = liveGaps(f, id ? contacts.length : 0)
  const nice = profileGaps(f, contacts.length).filter(g => !blocking.includes(g))

  async function save(nextStatus?: PartnerForm['status']) {
    const body = nextStatus ? { ...f, status: nextStatus } : f
    setSaving(true)
    const res = await fetch(id ? `/api/admin/foundry/partners/${id}` : '/api/admin/foundry/partners', {
      method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    setSaving(false)
    if (!res.ok) {
      const errs: Errors = data?.errors ?? {}
      setErrors(errs)
      toast(Object.values(errs)[0] ?? data?.error ?? 'Could not save.', 'error')
      const first = Object.keys(errs)[0]
      if (first) document.getElementById(`pf-${first}`)?.focus()
      return
    }
    const savedForm = { ...body, slug: data.slug }
    setF(savedForm); setSaved(savedForm); setErrors({})
    toast(nextStatus === 'live' ? `${f.name} is live.` : nextStatus === 'paused' ? `${f.name} is paused.` : 'Saved.')
    if (!id) router.replace(`/admin/foundry/partners/${data.id}`)
    else router.refresh()
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) { toast('Logo must be PNG, JPG, SVG or WebP.', 'error'); return }
    if (file.size > 2 * 1024 * 1024) { toast('Logo must be under 2MB.', 'error'); return }
    setLogoBusy(true)
    const supabase = createClient()
    const path = `${f.slug || slugify(f.name) || 'partner'}-${Date.now().toString(36)}.${file.name.split('.').pop()?.toLowerCase() ?? 'png'}`
    const { error } = await supabase.storage.from('partner-logos').upload(path, file, { upsert: true, contentType: file.type })
    setLogoBusy(false)
    if (error) { toast(error.message, 'error'); return }
    set('logo_url', supabase.storage.from('partner-logos').getPublicUrl(path).data.publicUrl)
  }

  const statusLabel = saved.status === 'live' ? 'Live' : saved.status === 'paused' ? 'Paused' : 'Draft'
  const err = (k: keyof PartnerForm) => errors[k] ? <span role="alert" className="mt-1 block text-xs font-semibold text-[var(--ff-crit)]">{errors[k]}</span> : null
  const field = (k: keyof PartnerForm) => cn(input, errors[k] && 'border-[var(--ff-crit)]')

  return (
    <div>
      {/* Save bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
        <div className="min-w-0">
          <Link href="/admin/foundry/partners" className="text-xs text-ink-3 hover:text-ink">← Partners</Link>
          <h1 className="truncate text-xl font-extrabold text-ink">{id ? f.name || 'Partner' : 'Add partner'}</h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
            <span className={cn('rounded-full border px-2 py-0.5 font-semibold',
              saved.status === 'live' ? 'border-[#bfe0cb] text-[#25613d]' : saved.status === 'draft' ? 'border-dashed border-ff-gold text-[#8a5f26]' : 'border-line text-ink-3')}>{statusLabel}</span>
            {isDemo && <span className="rounded-full border border-dashed border-ff-gold px-2 py-0.5 font-semibold text-[#8a5f26]">Demo</span>}
            {dirty && <span className="text-ink-3">Unsaved changes</span>}
            {id && saved.status === 'live' && <Link href={`/admin/foundry/${saved.slug}`} target="_blank" className="font-semibold text-ff-green hover:underline">View profile ↗</Link>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {id && saved.status === 'live' && (
            <button type="button" disabled={saving} onClick={() => save('paused')} className="min-h-[40px] rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-2 disabled:opacity-50">Pause</button>
          )}
          {id && saved.status !== 'live' && (
            <button type="button" disabled={saving || blocking.length > 0} onClick={() => save('live')}
              title={blocking.length ? `Add ${blocking.join(', ')} first` : undefined}
              className="min-h-[40px] rounded-xl border border-ff-green px-4 text-sm font-bold text-ff-green hover:bg-surface-2 disabled:opacity-50">Save and go live</button>
          )}
          <button type="button" disabled={saving || (!dirty && !!id)} onClick={() => save()}
            className="min-h-[40px] rounded-xl bg-ff-green px-5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50">
            {saving ? 'Saving…' : id ? 'Save changes' : 'Save as draft'}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <form className="min-w-0 space-y-5" onSubmit={e => { e.preventDefault(); save() }} noValidate>
          <Section title="Basics">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>Name<input id="pf-name" className={cn(field('name'), 'mt-1')} value={f.name} maxLength={120} onChange={e => set('name', e.target.value)} />{err('name')}</label>
              <label className={label}>Web address <span className={hint}>/foundry/…</span>
                <input id="pf-slug" className={cn(field('slug'), 'mt-1 font-mono')} value={f.slug} maxLength={60}
                  onChange={e => { setSlugTouched(true); set('slug', slugify(e.target.value) === 'partner' && !e.target.value ? '' : e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')) }} />
                {saved.status === 'live' && f.slug !== saved.slug && <span className="mt-1 block text-xs text-[#8a5f26]">Changing this breaks links people already have.</span>}
                {err('slug')}
              </label>
              <label className={label}>Category
                <select id="pf-category" className={cn(field('category'), 'mt-1')} value={f.category} onChange={e => set('category', e.target.value as Need)}>
                  <option value="">Choose…</option>
                  {NEEDS.map(n => <option key={n} value={n}>{NEED_LABEL[n]}</option>)}
                </select>{err('category')}
              </label>
              <label className={label}>Who it’s for
                <select id="pf-audience" className={cn(input, 'mt-1')} value={f.audience} onChange={e => set('audience', e.target.value as PartnerForm['audience'])}>
                  <option value="franchisee">Franchisees</option><option value="franchisor">Franchisors</option><option value="both">Both</option>
                </select>
              </label>
              <label className={label}>Website<input id="pf-website" className={cn(field('website'), 'mt-1')} value={f.website} placeholder="partner.co.uk" onChange={e => set('website', e.target.value)} />{err('website')}</label>
              <div className={label}>Logo <span className={hint}>(optional, the monogram shows without one)</span>
                <div className="mt-1 flex items-center gap-3">
                  {f.logo_url
                    ? <img src={f.logo_url} alt="" className="h-10 w-10 rounded-lg border border-line bg-white object-contain" />
                    : <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-lg bg-ff-green font-extrabold text-white">{(f.name || '?').charAt(0)}</span>}
                  <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" id="pf-logo" onChange={uploadLogo} />
                  <label htmlFor="pf-logo" className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2">{logoBusy ? 'Uploading…' : f.logo_url ? 'Replace' : 'Upload'}</label>
                  {f.logo_url && <button type="button" className="text-xs text-ink-3 hover:text-ink" onClick={() => set('logo_url', '')}>Remove</button>}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Their card in results" sub="What members see before they click.">
            <label className={label}>Tagline <span className={hint}>One line, e.g. “Franchise funding specialists”</span>
              <input id="pf-tagline" className={cn(field('tagline'), 'mt-1')} value={f.tagline} maxLength={140} onChange={e => set('tagline', e.target.value)} />
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <label className={label}>Member deal <span className={hint}>Gold badge on the card. Blank if no offer.</span>
                <input id="pf-offer_text" className={cn(input, 'mt-1')} value={f.offer_text} maxLength={160} placeholder="Arrangement fee waived · save ~£1,500" onChange={e => set('offer_text', e.target.value)} />
              </label>
              <label className={label}>Deal worth <span className={hint}>£, for insights</span>
                <input id="pf-deal_value_gbp" className={cn(field('deal_value_gbp'), 'mt-1 font-mono')} value={f.deal_value_gbp} inputMode="numeric" placeholder="1500" onChange={e => set('deal_value_gbp', e.target.value)} />{err('deal_value_gbp')}
              </label>
            </div>
            <label className={label}>Deal terms <span className={hint}>Small print on the profile</span>
              <input id="pf-deal_terms" className={cn(input, 'mt-1')} value={f.deal_terms} maxLength={600} placeholder="On your first loan. Mention The Foundry when they call." onChange={e => set('deal_terms', e.target.value)} />
            </label>
          </Section>

          <Section title="Profile" sub="The partner page.">
            <label className={label}>Description
              <textarea id="pf-description" className={cn(field('description'), 'mt-1')} rows={4} maxLength={3000} value={f.description} onChange={e => set('description', e.target.value)} />
            </label>
            <label className={label}>Our take <span className={hint}>Why we’d send our own franchisees to them. Shown in a green panel.</span>
              <textarea id="pf-our_take" className={cn(input, 'mt-1')} rows={3} maxLength={1500} value={f.our_take} onChange={e => set('our_take', e.target.value)} />
            </label>
            <Repeat title="Services" add="Add a service" items={f.services} max={12}
              blank={{ title: '', description: '', price: '' }} onChange={v => set('services', v)}
              render={(s, upd) => (
                <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                  <input aria-label="Service" className={input} placeholder="First-unit franchise loan" value={s.title} maxLength={120} onChange={e => upd({ ...s, title: e.target.value })} />
                  <input aria-label="Price" className={input} placeholder="From 4.9% APR" value={s.price} maxLength={60} onChange={e => upd({ ...s, price: e.target.value })} />
                  <input aria-label="Description" className={cn(input, 'sm:col-span-2')} placeholder="Up to 70% of opening costs, decision in 48 hours." value={s.description} maxLength={600} onChange={e => upd({ ...s, description: e.target.value })} />
                </div>
              )} />
            <Repeat title="FAQs" add="Add a question" items={f.faqs} max={12} blank={{ q: '', a: '' }} onChange={v => set('faqs', v)}
              render={(q, upd) => (
                <div className="grid gap-2">
                  <input aria-label="Question" className={input} placeholder="How much can I borrow?" value={q.q} maxLength={200} onChange={e => upd({ ...q, q: e.target.value })} />
                  <textarea aria-label="Answer" className={input} rows={2} placeholder="Usually up to 70% of the opening cost." value={q.a} maxLength={1200} onChange={e => upd({ ...q, a: e.target.value })} />
                </div>
              )} />
            <Repeat title="Key facts" sub="Up to 5, in the strip under their name. Leave empty to show reply time and clients." add="Add a fact" items={f.features} max={5}
              blank={{ label: '', value: '' }} onChange={v => set('features', v)}
              render={(x, upd) => (
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label="Label" className={input} placeholder="Loans" value={x.label} maxLength={40} onChange={e => upd({ ...x, label: e.target.value })} />
                  <input aria-label="Value" className={input} placeholder="£25k–£500k" value={x.value} maxLength={40} onChange={e => upd({ ...x, value: e.target.value })} />
                </div>
              )} />
          </Section>

          <Section title="Matching" sub="What the search uses to decide who to show and how well they fit.">
            <div>
              <div className={label} id="pf-regions-l">Where they work</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-labelledby="pf-regions-l" id="pf-regions">
                {REGIONS.map(([k, l]) => <Chip key={k} on={f.regions.includes(k)} onClick={() => toggle('regions', k)}>{l}</Chip>)}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>Based in<input id="pf-base_location" className={cn(input, 'mt-1')} value={f.base_location} maxLength={80} placeholder="Manchester" onChange={e => set('base_location', e.target.value)} /></label>
              <label className={label}>Price from<input id="pf-price_from" className={cn(input, 'mt-1')} value={f.price_from} maxLength={60} placeholder="From £99/month" onChange={e => set('price_from', e.target.value)} /></label>
              <label className={label}>Budget they suit, from <span className={hint}>£</span>
                <input id="pf-budget_min_gbp" className={cn(field('budget_min_gbp'), 'mt-1 font-mono')} value={f.budget_min_gbp} placeholder="25k" onChange={e => set('budget_min_gbp', e.target.value)} />{err('budget_min_gbp')}
              </label>
              <label className={label}>to <span className={hint}>£</span>
                <input id="pf-budget_max_gbp" className={cn(field('budget_max_gbp'), 'mt-1 font-mono')} value={f.budget_max_gbp} placeholder="500k" onChange={e => set('budget_max_gbp', e.target.value)} />{err('budget_max_gbp')}
              </label>
              <label className={label}>Franchise clients<input id="pf-client_count" className={cn(field('client_count'), 'mt-1 font-mono')} value={f.client_count} inputMode="numeric" placeholder="40" onChange={e => set('client_count', e.target.value)} />{err('client_count')}</label>
              <label className={label}>Typical reply <span className={hint}>hours</span><input id="pf-reply_hours_typical" className={cn(field('reply_hours_typical'), 'mt-1 font-mono')} value={f.reply_hours_typical} inputMode="numeric" placeholder="6" onChange={e => set('reply_hours_typical', e.target.value)} />{err('reply_hours_typical')}</label>
            </div>
            <div>
              <div className={label} id="pf-sectors-l">Sectors they know well <span className={hint}>Boosts fit when someone names the sector</span></div>
              <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-labelledby="pf-sectors-l">
                {SECTORS.map(s => <Chip key={s.key} on={f.sectors.includes(s.key)} onClick={() => toggle('sectors', s.key)}>{s.label}</Chip>)}
              </div>
            </div>
            <label className={label}>Keywords <span className={hint}>Comma separated, e.g. “kiosk, shopfit, design”</span>
              <input id="pf-keywords" className={cn(input, 'mt-1')} value={f.keywords} onChange={e => set('keywords', e.target.value)} />
            </label>
          </Section>

          <Section title="Status and trust">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className={label}>Trust level</div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(['listed', 'trusted', 'recommended'] as const).map(t => (
                    <button key={t} type="button" aria-pressed={f.trust_level === t} onClick={() => set('trust_level', t)}
                      className={cn('min-h-[38px] rounded-lg border text-sm font-semibold capitalize', f.trust_level === t ? 'border-ff-green bg-ff-green text-white' : 'border-line text-ink hover:bg-surface-2')}>{t}</button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-ink-3">Shown as a badge. Never changes the order of results.</p>
              </div>
              <label className={label}>Status
                <select id="pf-status" className={cn(field('status'), 'mt-1')} value={f.status} onChange={e => set('status', e.target.value as PartnerForm['status'])}>
                  <option value="draft">Draft: hidden, still being built</option>
                  <option value="live">Live: shown to members</option>
                  <option value="paused">Paused: hidden for now</option>
                </select>{err('status')}
              </label>
            </div>
          </Section>

          <Section title="Who we brief" sub="Never shown publicly. Revealed to a member once the partner has been in touch.">
            {id
              ? <PartnerContacts partnerId={id} initial={contacts} onChange={setContacts} />
              : <p className="text-sm text-ink-3">Save the partner first, then add the people we brief.</p>}
          </Section>
        </form>

        {/* Preview */}
        <aside className="space-y-4 xl:sticky xl:top-28" aria-label="Live preview">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="font-mono text-[11px] tracking-[0.08em] text-ink-3">LIVE PREVIEW · HOW MEMBERS SEE IT</div>
            <label className="mt-3 block text-xs font-semibold text-ink-2">Test search
              <input className={cn(input, 'mt-1')} value={test} onChange={e => { setTestTouched(true); setTest(e.target.value) }} />
            </label>
            {!preview ? (
              <p className="mt-4 text-sm text-ink-3">Pick a category to see their card.</p>
            ) : preview.scored ? (
              <div className="mt-4 space-y-2">
                <div inert className="pointer-events-none"><ResultCard p={preview.scored} searchId={null} compact /></div>
                <p className="text-xs text-ink-2">
                  {preview.inQuery
                    ? <>Shows for this search as <b className="text-ink">{preview.scored.label.toLowerCase()}</b> ({preview.scored.fit}).</>
                    : <>This search asks for {preview.askedFor.length ? preview.askedFor.join(' and ') : 'nothing we recognise'}, so they wouldn’t show. Fit above is if it had asked for {NEED_LABEL[f.category as Need].toLowerCase()}.</>}
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-line p-3 text-sm text-ink-2">
                They wouldn’t show for this search{preview.q.area ? ` (they don’t cover ${preview.q.area.label})` : ''}. Check where they work and their budget range.
              </p>
            )}
            <p className="mt-3 text-[11px] text-ink-3">Uses the real ranking. Updates as you type. Deals and trust never change the order.</p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
            <div className="font-mono text-[11px] tracking-[0.08em] text-ink-3">READY TO GO LIVE?</div>
            {blocking.length === 0
              ? <p className="mt-2 font-semibold text-[#2f7a4a]">✓ Everything needed is in.</p>
              : <ul className="mt-2 space-y-1">{blocking.map(g => <li key={g} className="text-[var(--ff-crit)]">✗ Add {g}</li>)}</ul>}
            {nice.length > 0 && (
              <>
                <div className="mt-3 text-xs text-ink-3">Would help them convert:</div>
                <ul className="mt-1 space-y-0.5 text-ink-2">{nice.map(g => <li key={g}>○ {g.charAt(0).toUpperCase() + g.slice(1)}</li>)}</ul>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      <div>
        <h2 className="text-base font-extrabold text-ink">{title}</h2>
        {sub && <p className="text-xs text-ink-3">{sub}</p>}
      </div>
      {children}
    </section>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn('min-h-[34px] rounded-full border px-3 text-sm', on ? 'border-ff-green bg-ff-green text-white' : 'border-line bg-surface text-ink hover:bg-surface-2')}>{children}</button>
  )
}

function Repeat<T>({ title, sub, add, items, max, blank, onChange, render }: {
  title: string; sub?: string; add: string; items: T[]; max: number; blank: T
  onChange: (v: T[]) => void; render: (item: T, update: (v: T) => void) => React.ReactNode
}) {
  return (
    <div className="space-y-2 border-t border-line pt-3">
      <div>
        <div className="text-xs font-semibold text-ink-2">{title}</div>
        {sub && <div className="text-xs text-ink-3">{sub}</div>}
      </div>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 rounded-xl bg-surface-2 p-2.5">
          <div className="min-w-0 flex-1">{render(it, v => onChange(items.map((x, j) => (j === i ? v : x))))}</div>
          <div className="flex flex-col gap-1">
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n) }} className="h-7 w-7 rounded-md text-ink-3 hover:bg-surface disabled:opacity-30">↑</button>
            <button type="button" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))} className="h-7 w-7 rounded-md text-ink-3 hover:bg-surface hover:text-[var(--ff-crit)]">×</button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, { ...blank }])} className="text-sm font-semibold text-ff-green hover:underline">+ {add}</button>
      )}
    </div>
  )
}
