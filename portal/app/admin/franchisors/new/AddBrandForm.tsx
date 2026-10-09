'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { UK_CITIES, SECTORS, FORMAT_TYPES } from '@/lib/supabase/types'
import { brandCompleteness } from '@/lib/profile-completeness'

/**
 * Add a brand by hand. One page, grouped the way admins think about a brand
 * (who → money → ideal franchisee → where → contact), only the brand name is
 * required, and a live "what's missing" panel shows what's left. Saving lands
 * on the new brand's record so the admin can carry on from there.
 */
type FormState = {
  brand_name: string
  category: string
  teaser: string
  highlights: [string, string, string]
  investment_min: string
  investment_max: string
  liquid_capital_min: string
  franchise_fee: string
  royalty_pct: string
  timeline_months: string
  operator_model: string
  experience_required: string
  format: string[]
  full_time_required: boolean
  multi_site_ready: boolean
  locations_available: string[]
  locations_display: string
  sectors: string[]
  franchisor_name: string
  franchisor_email: string
  status: 'draft' | 'active'
  send_invite: boolean
}

const initial: FormState = {
  brand_name: '', category: '', teaser: '', highlights: ['', '', ''],
  investment_min: '', investment_max: '', liquid_capital_min: '', franchise_fee: '', royalty_pct: '', timeline_months: '',
  operator_model: '', experience_required: '', format: [], full_time_required: true, multi_site_ready: false,
  locations_available: [], locations_display: '', sectors: [],
  franchisor_name: '', franchisor_email: '', status: 'active', send_invite: false,
}

const toggle = (arr: string[], val: string) => (arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-1.5 px-3 rounded-full text-sm border transition-colors ${
        active ? 'bg-ff-green text-white border-ff-green' : 'border-line text-ink-2 hover:bg-surface-2'
      }`}
    >
      {label}
    </button>
  )
}

function Choice({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => <Pill key={opt.value} label={opt.label} active={value === opt.value} onClick={() => onChange(value === opt.value ? '' : opt.value)} />)}
    </div>
  )
}

export default function AddBrandForm() {
  const [form, setForm] = useState<FormState>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [done, setDone] = useState<{ id: string; link?: string; emailed?: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const completeness = useMemo(() => brandCompleteness({
    ...form,
    highlights: form.highlights.filter(Boolean),
    contact_name: form.franchisor_name,
    contact_email: form.franchisor_email,
    logo_url: null,
  }), [form])

  const canInvite = Boolean(form.franchisor_name.trim() && form.franchisor_email.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.brand_name.trim()) { setError('Give the brand a name first.'); return }
    if (form.send_invite && !canInvite) { setError('Add the contact name and email to send an invite.'); return }
    setSaving(true)
    setError(null)
    setExistingId(null)

    try {
      const res = await fetch('/api/admin/franchisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, highlights: form.highlights.filter(Boolean) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        if (data.existing_id) setExistingId(data.existing_id)
        // Brand saved but the invite step failed: go to it, the invite can be resent there
        if (data.id) setDone({ id: data.id })
        setSaving(false)
        return
      }
      if (form.send_invite) {
        setDone({ id: data.id, link: data.invite_link, emailed: data.email_sent })
        setSaving(false)
      } else {
        router.push(`/admin/franchisors/${data.id}`)
        router.refresh()
      }
    } catch (err) {
      setError(`Request failed: ${err instanceof Error ? err.message : String(err)}`)
      setSaving(false)
    }
  }

  const openBrand = () => { if (done) { router.push(`/admin/franchisors/${done.id}`); router.refresh() } }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
      <div className="space-y-5 min-w-0">
        {/* 1. The brand */}
        <Card>
          <CardHeader><CardTitle>1. The brand</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Brand name *">
                <Input value={form.brand_name} onChange={e => set('brand_name', e.target.value)} placeholder="e.g. Sides, Zambrero" autoFocus required />
              </Field>
              <Field label="Category">
                <Input value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Quick Service Restaurant" />
              </Field>
            </div>
            <Field label="Concept teaser" hint="Shown to candidates before the brand is revealed, so don't name it.">
              <Textarea value={form.teaser} onChange={e => set('teaser', e.target.value)} rows={2} placeholder="Describe the concept without naming it…" />
            </Field>
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1">Key highlights</label>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                {form.highlights.map((h, i) => (
                  <Input key={i} value={h} placeholder={`Highlight ${i + 1}`}
                    onChange={e => { const u = [...form.highlights] as FormState['highlights']; u[i] = e.target.value; set('highlights', u) }} />
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 2. Commercials */}
        <Card>
          <CardHeader><CardTitle>2. Commercials</CardTitle></CardHeader>
          <CardBody className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Investment min (£)"><Input type="number" value={form.investment_min} onChange={e => set('investment_min', e.target.value)} placeholder="150000" /></Field>
            <Field label="Investment max (£)"><Input type="number" value={form.investment_max} onChange={e => set('investment_max', e.target.value)} placeholder="300000" /></Field>
            <Field label="Liquid capital min (£)"><Input type="number" value={form.liquid_capital_min} onChange={e => set('liquid_capital_min', e.target.value)} placeholder="50000" /></Field>
            <Field label="Franchise fee (£)"><Input type="number" value={form.franchise_fee} onChange={e => set('franchise_fee', e.target.value)} placeholder="25000" /></Field>
            <Field label="Royalty (%)"><Input type="number" step="0.1" value={form.royalty_pct} onChange={e => set('royalty_pct', e.target.value)} placeholder="6" /></Field>
            <Field label="Setup timeline (months)"><Input type="number" value={form.timeline_months} onChange={e => set('timeline_months', e.target.value)} placeholder="6" /></Field>
          </CardBody>
        </Card>

        {/* 3. Ideal franchisee */}
        <Card>
          <CardHeader><CardTitle>3. Ideal franchisee</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-2">Operator model</label>
              <Choice value={form.operator_model} onChange={v => set('operator_model', v)} options={[
                { value: 'owner-operator', label: 'Owner-operator' },
                { value: 'hire-manager', label: 'Hire a manager' },
                { value: 'either', label: 'Either' },
              ]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-2">Experience required</label>
              <Choice value={form.experience_required} onChange={v => set('experience_required', v)} options={[
                { value: 'none', label: 'None, first-timers welcome' },
                { value: 'management', label: 'Some management' },
                { value: 'food-beverage', label: 'F&B / hospitality' },
              ]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-2">Site formats</label>
              <div className="flex gap-2 flex-wrap">
                {FORMAT_TYPES.map(ft => <Pill key={ft.value} label={ft.label} active={form.format.includes(ft.value)} onClick={() => set('format', toggle(form.format, ft.value))} />)}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" checked={form.full_time_required} onChange={e => set('full_time_required', e.target.checked)} className="accent-ff-green" />
                Full-time commitment required
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" checked={form.multi_site_ready} onChange={e => set('multi_site_ready', e.target.checked)} className="accent-ff-green" />
                Open to multi-site operators
              </label>
            </div>
          </CardBody>
        </Card>

        {/* 4. Where */}
        <Card>
          <CardHeader><CardTitle>4. Locations &amp; sectors</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-2">Cities available</label>
              <div className="flex flex-wrap gap-2">
                {UK_CITIES.map(city => <Pill key={city.value} label={city.label} active={form.locations_available.includes(city.value)} onClick={() => set('locations_available', toggle(form.locations_available, city.value))} />)}
              </div>
            </div>
            <Field label="Location summary" hint="Shown to candidates, e.g. 'Major UK cities'.">
              <Input value={form.locations_display} onChange={e => set('locations_display', e.target.value)} placeholder="e.g. Major UK cities" />
            </Field>
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-2">Sector tags</label>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map(s => <Pill key={s.value} label={s.label} active={form.sectors.includes(s.value)} onClick={() => set('sectors', toggle(form.sectors, s.value))} />)}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 5. Contact & access */}
        <Card>
          <CardHeader><CardTitle>5. Contact &amp; portal access</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contact name"><Input value={form.franchisor_name} onChange={e => set('franchisor_name', e.target.value)} placeholder="Jane Smith" /></Field>
              <Field label="Contact email"><Input type="email" value={form.franchisor_email} onChange={e => set('franchisor_email', e.target.value)} placeholder="jane@brand.com" /></Field>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-2">Visibility</label>
              <Choice value={form.status} onChange={v => set('status', (v || 'active') as FormState['status'])} options={[
                { value: 'active', label: 'Active, in matching now' },
                { value: 'draft', label: 'Draft, hidden for now' },
              ]} />
            </div>
            <label className={`flex items-start gap-2.5 text-sm ${canInvite ? 'text-ink-2' : 'text-ink-3'}`}>
              <input type="checkbox" className="accent-ff-green mt-0.5" disabled={!canInvite}
                checked={form.send_invite && canInvite} onChange={e => set('send_invite', e.target.checked)} />
              <span>
                Email them a portal invite now
                <span className="block text-xs text-ink-3">{canInvite ? 'They get a 72-hour link to set a password and land on this brand.' : 'Add a contact name and email to enable. You can also invite later from the brand page.'}</span>
              </span>
            </label>
          </CardBody>
        </Card>
      </div>

      {/* Sticky summary: completeness + actions */}
      <aside className="xl:sticky xl:top-6 space-y-4">
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3">Profile</p>
            <span className="text-sm font-semibold tabular-nums text-ink">{completeness.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-line overflow-hidden mb-3">
            <div className="h-full bg-ff-green rounded-full transition-all" style={{ width: `${completeness.pct}%` }} />
          </div>
          {completeness.missing.length > 0 && (
            <>
              <p className="text-xs text-ink-3 mb-1.5">Still missing</p>
              <div className="flex flex-wrap gap-1.5">
                {completeness.missing.map(m => <span key={m} className="text-[11px] text-ink-2 bg-surface-2 border border-line-2 rounded-full px-2 py-0.5">{m}</span>)}
              </div>
              <p className="text-[11px] text-ink-3 mt-3">Only the name is required. Logo and the rest can be added later from the brand page.</p>
            </>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
            {existingId && <Link href={`/admin/franchisors/${existingId}`} className="block mt-1 font-medium underline">Open the existing brand →</Link>}
            {done && !done.link && <button type="button" onClick={openBrand} className="block mt-1 font-medium underline">Open the saved brand →</button>}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" fullWidth disabled={saving}>
            {saving ? 'Saving…' : form.send_invite && canInvite ? 'Create brand & send invite' : 'Create brand'}
          </Button>
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={() => router.back()} disabled={saving}>Cancel</Button>
        </div>
      </aside>

      <Modal open={!!done?.link} onClose={openBrand} maxWidth="max-w-md">
        <h3 className="text-base font-semibold text-ink mb-1">✓ {form.brand_name} created</h3>
        <p className="text-xs text-ink-3 mb-4">
          {done?.emailed
            ? `Invite emailed to ${form.franchisor_email}. Here's the link too if you want to send it yourself.`
            : `The invite email didn't send, so share this link with ${form.franchisor_name} directly. It lasts 72 hours.`}
        </p>
        <div className="bg-surface-2 border border-line rounded-lg px-3 py-2 text-xs text-ink-2 break-all mb-4">{done?.link}</div>
        <Button onClick={() => { navigator.clipboard.writeText(done?.link ?? ''); setCopied(true); setTimeout(() => setCopied(false), 2000) }} fullWidth size="lg" className="mb-2">
          {copied ? '✓ Copied' : 'Copy invite link'}
        </Button>
        <Button variant="secondary" fullWidth size="lg" onClick={openBrand}>Open brand</Button>
      </Modal>
    </form>
  )
}
