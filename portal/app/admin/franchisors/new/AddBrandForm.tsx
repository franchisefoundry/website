'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { UK_CITIES, SECTORS } from '@/lib/supabase/types'

type FormState = {
  franchisor_name: string
  franchisor_email: string
  brand_name: string
  category: string
  teaser: string
  investment_min: string
  investment_max: string
  timeline_months: string
  highlights: [string, string, string]
  operator_model: string
  experience_required: string
  format: string[]
  full_time_required: boolean
  multi_site_ready: boolean
  locations_available: string[]
  locations_display: string
  sectors: string[]
  status: 'draft' | 'active'
}

const initial: FormState = {
  franchisor_name: '',
  franchisor_email: '',
  brand_name: '',
  category: '',
  teaser: '',
  investment_min: '',
  investment_max: '',
  timeline_months: '',
  highlights: ['', '', ''],
  operator_model: '',
  experience_required: '',
  format: [],
  full_time_required: true,
  multi_site_ready: false,
  locations_available: [],
  locations_display: '',
  sectors: [],
  status: 'active',
}

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-1.5 px-3 rounded-full text-sm border transition-colors ${
        active ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  )
}

function RadioRow({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-3 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
            value === opt.value
              ? 'bg-brand-green text-white border-brand-green'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function AddBrandForm() {
  const [form, setForm] = useState<FormState>(initial)
  const [saving, setSaving] = useState<'save' | 'invite' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(sendInvite: boolean) {
    if (sendInvite && (!form.franchisor_email || !form.franchisor_name)) {
      setError('Please enter the franchisor name and email before sending an invite.')
      return
    }
    setSaving(sendInvite ? 'invite' : 'save')
    setError(null)

    try {
      const res = await fetch('/api/admin/franchisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          investment_min: form.investment_min ? Number(form.investment_min) : null,
          investment_max: form.investment_max ? Number(form.investment_max) : null,
          timeline_months: form.timeline_months ? Number(form.timeline_months) : null,
          send_invite: sendInvite,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        setSaving(null)
        return
      }

      router.push('/admin/franchisors')
      router.refresh()
    } catch (err) {
      setError(`Request failed: ${err instanceof Error ? err.message : String(err)}`)
      setSaving(null)
    }
  }

  return (
    <form onSubmit={e => e.preventDefault()} className="space-y-6 max-w-4xl">

      {/* Franchisor contact */}
      <Card>
        <CardHeader>
          <CardTitle>Franchisor contact <span className="text-slate-400 font-normal text-sm ml-1">— optional, required only to send invite</span></CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input
              type="text"
              value={form.franchisor_name}
              onChange={e => set('franchisor_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
            <input
              type="email"
              value={form.franchisor_email}
              onChange={e => set('franchisor_email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="jane@brand.com"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Profile status</label>
            <div className="flex gap-3">
              {[
                { value: 'active', label: 'Active — visible in matching immediately' },
                { value: 'draft', label: 'Draft — hidden until you approve' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('status', opt.value as 'active' | 'draft')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                    form.status === opt.value
                      ? 'bg-brand-green text-white border-brand-green'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Brand details */}
      <Card>
        <CardHeader><CardTitle>Brand details</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brand name</label>
              <input
                type="text"
                value={form.brand_name}
                onChange={e => set('brand_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="e.g. Sides, Zambrero"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="e.g. Quick Service Restaurant"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Concept teaser <span className="text-slate-400 font-normal text-xs">— shown to candidates without naming the brand</span>
            </label>
            <textarea
              value={form.teaser}
              onChange={e => set('teaser', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
              placeholder="Describe the concept without naming it…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Key highlights (up to 3)</label>
            {form.highlights.map((h, i) => (
              <input
                key={i}
                type="text"
                value={h}
                onChange={e => {
                  const updated = [...form.highlights] as [string, string, string]
                  updated[i] = e.target.value
                  set('highlights', updated)
                }}
                placeholder={`Highlight ${i + 1} — e.g. No food experience required`}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent mb-2"
              />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Investment */}
      <Card>
        <CardHeader><CardTitle>Investment</CardTitle></CardHeader>
        <CardBody className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Minimum (£)</label>
            <input type="number" value={form.investment_min} onChange={e => set('investment_min', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="e.g. 150000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Maximum (£)</label>
            <input type="number" value={form.investment_max} onChange={e => set('investment_max', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="e.g. 300000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Setup timeline (months)</label>
            <input type="number" value={form.timeline_months} onChange={e => set('timeline_months', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="e.g. 6" />
          </div>
        </CardBody>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader><CardTitle>Franchisee requirements</CardTitle></CardHeader>
        <CardBody className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Operator model</label>
            <RadioRow
              value={form.operator_model}
              onChange={v => set('operator_model', v)}
              options={[
                { value: 'owner-operator', label: 'Owner-operator (hands-on)' },
                { value: 'hire-manager', label: 'Hire a manager (semi-passive)' },
                { value: 'either', label: 'Either works' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Experience required</label>
            <RadioRow
              value={form.experience_required}
              onChange={v => set('experience_required', v)}
              options={[
                { value: 'none', label: 'None — welcomes first-timers' },
                { value: 'management', label: 'Some management experience' },
                { value: 'food-beverage', label: 'F&B / hospitality background' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Site format(s)</label>
            <div className="flex gap-3 flex-wrap">
              {['dine-in', 'takeaway', 'kiosk', 'flexible'].map(v => (
                <Pill key={v} label={v.charAt(0).toUpperCase() + v.slice(1)} active={form.format.includes(v)}
                  onClick={() => set('format', toggle(form.format, v))} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full-time required?</label>
              <RadioRow value={String(form.full_time_required)} onChange={v => set('full_time_required', v === 'true')}
                options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Multi-site ready?</label>
              <RadioRow value={String(form.multi_site_ready)} onChange={v => set('multi_site_ready', v === 'true')}
                options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Locations */}
      <Card>
        <CardHeader><CardTitle>Location coverage</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Cities available</label>
            <div className="flex flex-wrap gap-2">
              {UK_CITIES.map(city => (
                <Pill key={city.value} label={city.label}
                  active={form.locations_available.includes(city.value)}
                  onClick={() => set('locations_available', toggle(form.locations_available, city.value))} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Display text <span className="text-slate-400 font-normal text-xs">— shown to candidates</span>
            </label>
            <input type="text" value={form.locations_display} onChange={e => set('locations_display', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="e.g. Major UK cities" />
          </div>
        </CardBody>
      </Card>

      {/* Sectors */}
      <Card>
        <CardHeader><CardTitle>Sector tags</CardTitle></CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {SECTORS.map(s => (
              <Pill key={s.value} label={s.label} active={form.sectors.includes(s.value)}
                onClick={() => set('sectors', toggle(form.sectors, s.value))} />
            ))}
          </div>
        </CardBody>
      </Card>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex gap-3 pb-8">
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={saving !== null}
          className="bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 px-8 rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {saving === 'save' ? 'Saving…' : 'Save profile'}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={saving !== null}
          className="border-2 border-brand-green text-brand-green hover:bg-brand-green hover:text-white font-medium py-2.5 px-8 rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {saving === 'invite' ? 'Sending…' : 'Save & send invite'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={saving !== null}
          className="border border-slate-300 text-slate-700 text-sm font-medium py-2.5 px-6 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
