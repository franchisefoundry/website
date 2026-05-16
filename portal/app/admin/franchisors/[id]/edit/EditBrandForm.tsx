'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { UK_CITIES, SECTORS, type FranchisorProfile } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

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

interface Props {
  franchisor: FranchisorProfile
}

export default function EditBrandForm({ franchisor }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    brand_name: franchisor.brand_name ?? '',
    category: franchisor.category ?? '',
    teaser: franchisor.teaser ?? '',
    investment_min: franchisor.investment_min?.toString() ?? '',
    investment_max: franchisor.investment_max?.toString() ?? '',
    investment_display: franchisor.investment_display ?? '',
    timeline_months: franchisor.timeline_months?.toString() ?? '',
    highlights: (franchisor.highlights?.length >= 3
      ? franchisor.highlights.slice(0, 3)
      : [...(franchisor.highlights ?? []), '', '', ''].slice(0, 3)) as [string, string, string],
    operator_model: franchisor.operator_model ?? '',
    experience_required: franchisor.experience_required ?? '',
    format: franchisor.format ?? [],
    full_time_required: franchisor.full_time_required ?? false,
    multi_site_ready: franchisor.multi_site_ready ?? false,
    locations_available: franchisor.locations_available ?? [],
    locations_display: franchisor.locations_display ?? '',
    sectors: franchisor.sectors ?? [],
    contact_email: franchisor.contact_email ?? '',
    contact_name: franchisor.contact_name ?? '',
  })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('franchisor_profiles')
        .update({
          brand_name: form.brand_name || null,
          category: form.category || null,
          teaser: form.teaser || null,
          investment_min: form.investment_min ? Number(form.investment_min) : null,
          investment_max: form.investment_max ? Number(form.investment_max) : null,
          investment_display: form.investment_display || null,
          timeline_months: form.timeline_months ? Number(form.timeline_months) : null,
          highlights: form.highlights.filter(Boolean),
          operator_model: form.operator_model || null,
          experience_required: form.experience_required || null,
          format: form.format,
          full_time_required: form.full_time_required,
          multi_site_ready: form.multi_site_ready,
          locations_available: form.locations_available,
          locations_display: form.locations_display || null,
          sectors: form.sectors,
          contact_email: form.contact_email || null,
          contact_name: form.contact_name || null,
        })
        .eq('id', franchisor.id)

      if (err) { setError(err.message); return }
      router.push(`/admin/franchisors/${franchisor.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={e => e.preventDefault()} className="space-y-6 max-w-4xl">

      {/* Contact info */}
      <Card>
        <CardHeader><CardTitle>Contact details</CardTitle></CardHeader>
        <CardBody className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact name</label>
            <input type="text" value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact email</label>
            <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="jane@brand.com" />
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
              <input type="text" value={form.brand_name} onChange={e => set('brand_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="e.g. Sides, Zambrero" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input type="text" value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="e.g. Quick Service Restaurant" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Concept teaser <span className="text-slate-400 font-normal text-xs">— shown to candidates without naming the brand</span>
            </label>
            <textarea value={form.teaser} onChange={e => set('teaser', e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
              placeholder="Describe the concept without naming it…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Key highlights (up to 3)</label>
            {form.highlights.map((h, i) => (
              <input key={i} type="text" value={h}
                onChange={e => {
                  const updated = [...form.highlights] as [string, string, string]
                  updated[i] = e.target.value
                  set('highlights', updated)
                }}
                placeholder={`Highlight ${i + 1}`}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent mb-2" />
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
          <div className="col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Display text <span className="text-slate-400 font-normal text-xs">— shown to candidates e.g. &ldquo;£150,000 – £300,000&rdquo;</span>
            </label>
            <input type="text" value={form.investment_display} onChange={e => set('investment_display', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="e.g. £150,000 – £300,000" />
          </div>
        </CardBody>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader><CardTitle>Franchisee requirements</CardTitle></CardHeader>
        <CardBody className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Operator model</label>
            <RadioRow value={form.operator_model} onChange={v => set('operator_model', v)}
              options={[
                { value: 'owner-operator', label: 'Owner-operator (hands-on)' },
                { value: 'hire-manager', label: 'Hire a manager (semi-passive)' },
                { value: 'either', label: 'Either works' },
              ]} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Experience required</label>
            <RadioRow value={form.experience_required} onChange={v => set('experience_required', v)}
              options={[
                { value: 'none', label: 'None — welcomes first-timers' },
                { value: 'management', label: 'Some management experience' },
                { value: 'food-beverage', label: 'F&B / hospitality background' },
              ]} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Site format(s)</label>
            <div className="flex gap-3 flex-wrap">
              {['dine-in', 'takeaway', 'kiosk', 'delivery', 'flexible'].map(v => (
                <Pill key={v} label={v.charAt(0).toUpperCase() + v.slice(1)}
                  active={form.format.includes(v)}
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
        <button type="button" onClick={handleSave} disabled={saving}
          className="bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 px-8 rounded-lg text-sm transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => router.back()} disabled={saving}
          className="border border-slate-300 text-slate-700 text-sm font-medium py-2.5 px-6 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60">
          Cancel
        </button>
      </div>
    </form>
  )
}
