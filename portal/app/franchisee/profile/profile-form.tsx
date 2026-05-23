'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { UK_CITIES, SECTORS } from '@/lib/supabase/types'
import type { Profile, FranchiseeProfile } from '@/lib/supabase/types'

interface Props {
  profile: Profile | null
  franchiseeProfile: FranchiseeProfile | null
}

export default function ProfileForm({ profile, franchiseeProfile }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [investmentMin, setInvestmentMin] = useState(franchiseeProfile?.investment_min?.toString() ?? '')
  const [investmentMax, setInvestmentMax] = useState(franchiseeProfile?.investment_max?.toString() ?? '')
  const [locations, setLocations] = useState<string[]>(franchiseeProfile?.preferred_locations ?? [])
  const [operatorModel, setOperatorModel] = useState(franchiseeProfile?.operator_model ?? '')
  const [experience, setExperience] = useState(franchiseeProfile?.experience ?? '')
  const [fullTime, setFullTime] = useState(franchiseeProfile?.full_time_available ?? null as boolean | null)
  const [multiSite, setMultiSite] = useState(franchiseeProfile?.multi_site_interest ?? false)
  const [timeline, setTimeline] = useState(franchiseeProfile?.timeline_months?.toString() ?? '')
  const [sectors, setSectors] = useState<string[]>(franchiseeProfile?.sectors ?? [])
  const [goals, setGoals] = useState(franchiseeProfile?.goals ?? '')

  function toggleLocation(val: string) {
    setLocations(prev => prev.includes(val) ? prev.filter(l => l !== val) : [...prev, val])
  }

  function toggleSector(val: string) {
    setSectors(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()

    await Promise.all([
      supabase.from('profiles').update({ full_name: fullName, phone: phone || null }).eq('id', profile!.id),
      supabase.from('franchisee_profiles').update({
        investment_min: investmentMin ? parseInt(investmentMin) : null,
        investment_max: investmentMax ? parseInt(investmentMax) : null,
        preferred_locations: locations,
        operator_model: operatorModel || null,
        experience: experience || null,
        full_time_available: fullTime,
        multi_site_interest: multiSite,
        timeline_months: timeline ? parseInt(timeline) : null,
        sectors,
        goals: goals || null,
      }).eq('user_id', profile!.id),
    ])

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Personal details */}
      <Card>
        <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
        </CardBody>
      </Card>

      {/* Investment */}
      <Card>
        <CardHeader><CardTitle>Investment budget</CardTitle></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Minimum (£)</label>
            <input
              type="number"
              value={investmentMin}
              onChange={e => setInvestmentMin(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Maximum (£)</label>
            <input
              type="number"
              value={investmentMax}
              onChange={e => setInvestmentMax(e.target.value)}
              placeholder="e.g. 200000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
        </CardBody>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader><CardTitle>Your preferences</CardTitle></CardHeader>
        <CardBody className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">How do you want to operate?</label>
            <div className="flex flex-col sm:flex-row gap-2">
              {[
                { value: 'owner-operator', label: 'Hands-on (owner-operator)' },
                { value: 'hire-manager', label: 'Semi-passive (hire a manager)' },
                { value: 'either', label: 'Either works for me' },
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Your background / experience</label>
            <div className="flex gap-3">
              {[
                { value: 'none', label: 'No industry experience' },
                { value: 'management', label: 'Management experience' },
                { value: 'food-beverage', label: 'F&B / hospitality' },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setExperience(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                    experience === opt.value
                      ? 'bg-brand-green text-white border-brand-green'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full-time commitment available?</label>
              <div className="flex gap-3">
                {[{ value: true, label: 'Yes' }, { value: false, label: 'No' }].map(opt => (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => setFullTime(opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                      fullTime === opt.value
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Interest in multi-site growth?</label>
              <div className="flex gap-3">
                {[{ value: true, label: 'Yes' }, { value: false, label: 'No' }].map(opt => (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => setMultiSite(opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                      multiSite === opt.value
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Timeline to opening (months)
            </label>
            <input
              type="number"
              value={timeline}
              onChange={e => setTimeline(e.target.value)}
              placeholder="e.g. 12"
              className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
        </CardBody>
      </Card>

      {/* Locations */}
      <Card>
        <CardHeader><CardTitle>Preferred locations</CardTitle></CardHeader>
        <CardBody>
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
        </CardBody>
      </Card>

      {/* Sectors */}
      <Card>
        <CardHeader><CardTitle>Sector interests</CardTitle></CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {SECTORS.map(s => (
              <button
                type="button"
                key={s.value}
                onClick={() => toggleSector(s.value)}
                className={`py-1.5 px-3 rounded-full text-sm border transition-colors ${
                  sectors.includes(s.value)
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

      {/* Goals */}
      <Card>
        <CardHeader><CardTitle>Goals & background</CardTitle></CardHeader>
        <CardBody>
          <textarea
            value={goals}
            onChange={e => setGoals(e.target.value)}
            rows={4}
            placeholder="Tell us what you're looking to achieve, your background, and anything else that's important to you…"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
          />
        </CardBody>
      </Card>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved successfully</span>}
      </div>
    </form>
  )
}
