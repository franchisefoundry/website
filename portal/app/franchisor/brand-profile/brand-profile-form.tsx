'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { UK_CITIES, SECTORS } from '@/lib/supabase/types'
import type { FranchisorProfile } from '@/lib/supabase/types'
import { slugify } from '@/lib/utils'

interface Props {
  brandProfile: FranchisorProfile | null
  userId: string
}

export default function BrandProfileForm({ brandProfile, userId }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitRequested, setSubmitRequested] = useState(false)

  const [brandName, setBrandName] = useState(brandProfile?.brand_name ?? '')
  const [category, setCategory] = useState(brandProfile?.category ?? '')
  const [teaser, setTeaser] = useState(brandProfile?.teaser ?? '')
  const [investmentMin, setInvestmentMin] = useState(brandProfile?.investment_min?.toString() ?? '')
  const [investmentMax, setInvestmentMax] = useState(brandProfile?.investment_max?.toString() ?? '')
  const [locations, setLocations] = useState<string[]>(brandProfile?.locations_available ?? [])
  const [locationsDisplay, setLocationsDisplay] = useState(brandProfile?.locations_display ?? '')
  const [sectorTags, setSectorTags] = useState<string[]>(brandProfile?.sectors ?? [])
  const [timelineMonths, setTimelineMonths] = useState(brandProfile?.timeline_months?.toString() ?? '')
  const [highlights, setHighlights] = useState<string[]>(
    brandProfile?.highlights?.length ? brandProfile.highlights : ['', '', '']
  )
  const [operatorModel, setOperatorModel] = useState(brandProfile?.operator_model ?? '')
  const [format, setFormat] = useState<string[]>(brandProfile?.format ?? [])
  const [experienceRequired, setExperienceRequired] = useState(brandProfile?.experience_required ?? '')
  const [multiSiteReady, setMultiSiteReady] = useState(brandProfile?.multi_site_ready ?? false)
  const [fullTimeRequired, setFullTimeRequired] = useState(brandProfile?.full_time_required ?? true)

  function toggleLocation(val: string) {
    setLocations(prev => prev.includes(val) ? prev.filter(l => l !== val) : [...prev, val])
  }

  function toggleSector(val: string) {
    setSectorTags(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val])
  }

  function toggleFormat(val: string) {
    setFormat(prev => prev.includes(val) ? prev.filter(f => f !== val) : [...prev, val])
  }

  async function handleSave(e: React.FormEvent, submitForReview = false) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const slug = brandProfile?.slug || slugify(brandName)

    const updates: Partial<FranchisorProfile> = {
      brand_name: brandName,
      slug,
      category,
      teaser,
      investment_min: investmentMin ? parseInt(investmentMin) : null,
      investment_max: investmentMax ? parseInt(investmentMax) : null,
      investment_display: investmentMin && investmentMax
        ? `£${parseInt(investmentMin).toLocaleString('en-GB')} – £${parseInt(investmentMax).toLocaleString('en-GB')}`
        : null,
      locations_available: locations,
      locations_display: locationsDisplay || null,
      sectors: sectorTags,
      timeline_months: timelineMonths ? parseInt(timelineMonths) : null,
      highlights: highlights.filter(Boolean),
      operator_model: operatorModel as FranchisorProfile['operator_model'] || null,
      format,
      experience_required: experienceRequired as FranchisorProfile['experience_required'] || null,
      multi_site_ready: multiSiteReady,
      full_time_required: fullTimeRequired,
      ...(submitForReview ? { status: 'pending_review' } : {}),
    }

    if (brandProfile) {
      await supabase.from('franchisor_profiles').update(updates).eq('id', brandProfile.id)
    } else {
      await supabase.from('franchisor_profiles').insert({ ...updates, user_id: userId, status: 'draft' })
    }

    setSaving(false)
    setSaved(true)
    if (submitForReview) setSubmitRequested(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  const isActive = brandProfile?.status === 'active'

  return (
    <form onSubmit={e => handleSave(e)} className="space-y-6">
      {isActive && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 text-sm text-emerald-800">
          Your brand profile is live. Changes you save will be reviewed by the Franchise Foundry team.
        </div>
      )}

      {/* Brand basics */}
      <Card>
        <CardHeader><CardTitle>Brand details</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brand name</label>
              <input
                type="text"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder="e.g. Sides, Zambrero"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Quick Service Restaurant, Coffee"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Concept teaser
              <span className="text-slate-400 font-normal ml-1 text-xs">— shown to candidates without naming the brand</span>
            </label>
            <textarea
              value={teaser}
              onChange={e => setTeaser(e.target.value)}
              rows={3}
              placeholder="Describe your concept — what makes it distinctive, the customer proposition, the model. Don't include the brand name."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Key highlights (up to 3)</label>
            {highlights.map((h, i) => (
              <input
                key={i}
                type="text"
                value={h}
                onChange={e => {
                  const updated = [...highlights]
                  updated[i] = e.target.value
                  setHighlights(updated)
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
            <input
              type="number"
              value={investmentMin}
              onChange={e => setInvestmentMin(e.target.value)}
              placeholder="e.g. 150000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Maximum (£)</label>
            <input
              type="number"
              value={investmentMax}
              onChange={e => setInvestmentMax(e.target.value)}
              placeholder="e.g. 300000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Setup timeline (months)
            </label>
            <input
              type="number"
              value={timelineMonths}
              onChange={e => setTimelineMonths(e.target.value)}
              placeholder="e.g. 6"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
        </CardBody>
      </Card>

      {/* Matching signals */}
      <Card>
        <CardHeader><CardTitle>Franchisee requirements</CardTitle></CardHeader>
        <CardBody className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Operator model</label>
            <div className="flex gap-3">
              {[
                { value: 'owner-operator', label: 'Owner-operator (hands-on)' },
                { value: 'hire-manager', label: 'Hire a manager (semi-passive)' },
                { value: 'either', label: 'Either works' },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setOperatorModel(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                    operatorModel === opt.value
                      ? 'bg-brand-green text-white border-brand-green'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Experience required</label>
            <div className="flex gap-3">
              {[
                { value: 'none', label: 'None — welcomes first-timers' },
                { value: 'management', label: 'Some management experience' },
                { value: 'food-beverage', label: 'F&B / hospitality background' },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setExperienceRequired(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                    experienceRequired === opt.value
                      ? 'bg-brand-green text-white border-brand-green'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Site format(s)</label>
            <div className="flex gap-3 flex-wrap">
              {[
                { value: 'dine-in', label: 'Dine-in' },
                { value: 'takeaway', label: 'Takeaway' },
                { value: 'kiosk', label: 'Kiosk / bar' },
                { value: 'flexible', label: 'Flexible' },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => toggleFormat(opt.value)}
                  className={`py-1.5 px-4 rounded-full text-sm border transition-colors ${
                    format.includes(opt.value)
                      ? 'bg-brand-green text-white border-brand-green'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full-time required?</label>
              <div className="flex gap-3">
                {[{ value: true, label: 'Yes' }, { value: false, label: 'No' }].map(opt => (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => setFullTimeRequired(opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                      fullTimeRequired === opt.value
                        ? 'bg-brand-green text-white border-brand-green'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Multi-site ready?</label>
              <div className="flex gap-3">
                {[{ value: true, label: 'Yes' }, { value: false, label: 'No' }].map(opt => (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => setMultiSiteReady(opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                      multiSiteReady === opt.value
                        ? 'bg-brand-green text-white border-brand-green'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
                <button
                  type="button"
                  key={city.value}
                  onClick={() => toggleLocation(city.value)}
                  className={`py-1.5 px-3 rounded-full text-sm border transition-colors ${
                    locations.includes(city.value)
                      ? 'bg-brand-green text-white border-brand-green'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {city.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Display text <span className="text-slate-400 font-normal text-xs">— shown to candidates</span>
            </label>
            <input
              type="text"
              value={locationsDisplay}
              onChange={e => setLocationsDisplay(e.target.value)}
              placeholder="e.g. Major UK cities, Greater Manchester & West Yorkshire"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
        </CardBody>
      </Card>

      {/* Sectors */}
      <Card>
        <CardHeader><CardTitle>Sector tags</CardTitle></CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {SECTORS.map(s => (
              <button
                type="button"
                key={s.value}
                onClick={() => toggleSector(s.value)}
                className={`py-1.5 px-3 rounded-full text-sm border transition-colors ${
                  sectorTags.includes(s.value)
                    ? 'bg-brand-green text-white border-brand-green'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>

        {brandProfile?.status === 'draft' && (
          <button
            type="button"
            onClick={e => handleSave(e as unknown as React.FormEvent, true)}
            disabled={saving || !brandName}
            className="border border-brand-green text-brand-green hover:bg-brand-green hover:text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            Submit for review
          </button>
        )}

        {saved && (
          <span className="text-sm text-emerald-600">
            {submitRequested ? 'Submitted for review' : 'Saved'}
          </span>
        )}
      </div>
    </form>
  )
}
