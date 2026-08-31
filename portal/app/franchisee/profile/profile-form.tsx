'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UK_CITIES, SECTORS, FORMAT_TYPES } from '@/lib/supabase/types'
import type { Profile, FranchiseeProfile } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { CheckIcon } from '@/components/icons'

interface Props {
  profile: Profile | null
  franchiseeProfile: FranchiseeProfile | null
}

const inp = 'w-full px-3 py-2.5 rounded-xl text-sm text-ink bg-surface-2 border border-transparent hover:bg-[#f2f4ed] focus:bg-surface focus:border-ff-green focus:outline-none focus:ring-[3px] focus:ring-ff-green/10 transition placeholder:text-ink-3'
const lbl = 'block text-sm font-medium text-ink-2 mb-1.5'

const SECTIONS = [
  { id: 'details', label: 'Details', title: 'Your details', help: 'How we reach you.' },
  { id: 'investment', label: 'Investment', title: 'Investment budget', help: 'What you can invest, and when.' },
  { id: 'preferences', label: 'Preferences', title: 'How you want to operate', help: 'Your involvement, background and commitment.' },
  { id: 'locations', label: 'Locations', title: 'Preferred locations', help: 'Where you’d like to open.' },
  { id: 'interests', label: 'Interests', title: 'Formats & sectors', help: 'The kinds of franchise you’re open to.' },
  { id: 'goals', label: 'Goals', title: 'Goals & background', help: 'What you’re looking to achieve.' },
] as const

function Segmented({ options, value, onChange }: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
  const idx = options.findIndex(o => o.v === value)
  const n = options.length
  return (
    <div className="relative flex rounded-xl bg-surface-2 border border-line p-1">
      {idx >= 0 && (
        <span aria-hidden className="absolute top-1 bottom-1 rounded-lg bg-ff-green shadow-sm transition-all duration-200 ease-out"
          style={{ width: `calc((100% - 0.5rem)/${n})`, left: `calc(0.25rem + ${idx} * ((100% - 0.5rem)/${n}))` }} />
      )}
      {options.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={cn('relative z-10 flex-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap', value === o.v ? 'text-white' : 'text-ink-2 hover:text-ink')}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('rounded-full px-3.5 py-1.5 text-sm border transition-colors', on ? 'bg-ff-green text-white border-ff-green shadow-sm' : 'border-line text-ink-2 hover:border-[#cdd2c8]')}>
      {children}
    </button>
  )
}

export default function ProfileForm({ profile, franchiseeProfile }: Props) {
  const router = useRouter()
  const [section, setSection] = useState<string>('details')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [investmentMin, setInvestmentMin] = useState(franchiseeProfile?.investment_min?.toString() ?? '')
  const [investmentMax, setInvestmentMax] = useState(franchiseeProfile?.investment_max?.toString() ?? '')
  const [liquidCapital, setLiquidCapital] = useState(franchiseeProfile?.liquid_capital?.toString() ?? '')
  const [formatTypes, setFormatTypes] = useState<string[]>(franchiseeProfile?.format_types ?? [])
  const PRESET_CITIES = UK_CITIES.map(c => c.value)
  const initialLocations = (franchiseeProfile?.preferred_locations ?? []).filter(l => PRESET_CITIES.includes(l))
  const initialOther = (franchiseeProfile?.preferred_locations ?? []).filter(l => !PRESET_CITIES.includes(l)).join(', ')
  const [locations, setLocations] = useState<string[]>(initialLocations)
  const [otherLocation, setOtherLocation] = useState(initialOther)
  const [operatorModel, setOperatorModel] = useState(franchiseeProfile?.operator_model ?? '')
  const [experience, setExperience] = useState(franchiseeProfile?.experience ?? '')
  const [fullTime, setFullTime] = useState<boolean | null>(franchiseeProfile?.full_time_available ?? null)
  const [multiSite, setMultiSite] = useState(franchiseeProfile?.multi_site_interest ?? false)
  const [timeline, setTimeline] = useState(franchiseeProfile?.timeline_months?.toString() ?? '')
  const [sectors, setSectors] = useState<string[]>(franchiseeProfile?.sectors ?? [])
  const [goals, setGoals] = useState(franchiseeProfile?.goals ?? '')

  const tgl = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])

  const snapshot = JSON.stringify({ fullName, phone, investmentMin, investmentMax, liquidCapital, formatTypes, locations, otherLocation, operatorModel, experience, fullTime, multiSite, timeline, sectors, goals })
  const [baseline, setBaseline] = useState(snapshot)
  const dirty = snapshot !== baseline

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await Promise.all([
      supabase.from('profiles').update({ full_name: fullName, phone: phone || null }).eq('id', profile!.id),
      supabase.from('franchisee_profiles').update({
        investment_min: investmentMin ? parseInt(investmentMin) : null,
        investment_max: investmentMax ? parseInt(investmentMax) : null,
        liquid_capital: liquidCapital ? parseInt(liquidCapital) : null,
        format_types: formatTypes,
        preferred_locations: [...locations, ...otherLocation.split(',').map(l => l.trim()).filter(Boolean)],
        operator_model: operatorModel || null,
        experience: experience || null,
        full_time_available: fullTime,
        multi_site_interest: multiSite,
        timeline_months: timeline ? parseInt(timeline) : null,
        sectors,
        goals: goals || null,
      }).eq('user_id', profile!.id),
    ])
    setSaving(false); setSaved(true); setBaseline(snapshot)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  const checklist = [
    { done: !!fullName, section: 'details' },
    { done: !!(investmentMin && investmentMax), section: 'investment' },
    { done: !!operatorModel, section: 'preferences' },
    { done: !!experience, section: 'preferences' },
    { done: locations.length > 0 || !!otherLocation, section: 'locations' },
    { done: sectors.length > 0, section: 'interests' },
    { done: !!goals, section: 'goals' },
  ]
  const strength = Math.round((checklist.filter(c => c.done).length / checklist.length) * 100)

  const sectionDone: Record<string, boolean> = {
    details: !!fullName,
    investment: !!(investmentMin && investmentMax),
    preferences: !!(operatorModel && experience),
    locations: locations.length > 0 || !!otherLocation,
    interests: sectors.length > 0 || formatTypes.length > 0,
    goals: !!goals,
  }

  const cur = SECTIONS.find(s => s.id === section)!

  return (
    <form onSubmit={handleSave}>
      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-5 items-start">
        {/* Section rail */}
        <nav className="lg:sticky lg:top-4 flex lg:flex-col gap-1 overflow-x-auto scrollbar-hidden -mx-1 px-1">
          {SECTIONS.map((s, i) => (
            <button key={s.id} type="button" onClick={() => setSection(s.id)}
              className={cn('flex items-center gap-2.5 text-sm font-medium rounded-xl px-3 py-2.5 text-left whitespace-nowrap transition-colors flex-shrink-0',
                section === s.id ? 'bg-ff-green/10 text-ff-green' : 'text-ink-2 hover:bg-surface-2')}>
              <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                sectionDone[s.id] ? 'bg-ff-green text-white' : section === s.id ? 'bg-ff-green/15 text-ff-green' : 'bg-surface-2 text-ink-3')}>
                {sectionDone[s.id] ? <CheckIcon className="w-3 h-3" /> : i + 1}
              </span>
              {s.label}
            </button>
          ))}
          <div className="hidden lg:block mt-3 px-3">
            <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full bg-ff-green transition-all" style={{ width: `${strength}%` }} /></div>
            <p className="text-[11px] text-ink-3 mt-1.5">{strength}% complete</p>
          </div>
        </nav>

        {/* Active section */}
        <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] overflow-hidden min-w-0">
          <div className="px-5 sm:px-6 py-5">
            <div className="mb-5">
              <h3 className="text-base font-bold text-ink tracking-[-0.01em]">{cur.title}</h3>
              <p className="text-xs text-ink-2 mt-0.5">{cur.help}</p>
            </div>

            {section === 'details' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={lbl}>Full name</label><input value={fullName} onChange={e => setFullName(e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Phone number</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" className={inp} /></div>
              </div>
            )}

            {section === 'investment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className={lbl}>Minimum (£)</label><input type="number" value={investmentMin} onChange={e => setInvestmentMin(e.target.value)} placeholder="50000" className={inp} /></div>
                  <div><label className={lbl}>Maximum (£)</label><input type="number" value={investmentMax} onChange={e => setInvestmentMax(e.target.value)} placeholder="200000" className={inp} /></div>
                  <div><label className={lbl}>Timeline (months)</label><input type="number" value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="12" className={inp} /></div>
                </div>
                <div><label className={lbl}>Liquid capital available (£)</label><input type="number" value={liquidCapital} onChange={e => setLiquidCapital(e.target.value)} placeholder="30000" className={inp} /><p className="text-xs text-ink-3 mt-1">Cash you can deploy now without borrowing.</p></div>
              </div>
            )}

            {section === 'preferences' && (
              <div className="space-y-5">
                <div><label className={lbl}>How do you want to operate?</label><Segmented value={operatorModel} onChange={setOperatorModel} options={[{ v: 'owner-operator', l: 'Hands-on' }, { v: 'hire-manager', l: 'Hire a manager' }, { v: 'either', l: 'Either' }]} /></div>
                <div><label className={lbl}>Your background / experience</label><Segmented value={experience} onChange={setExperience} options={[{ v: 'none', l: 'None' }, { v: 'management', l: 'Management' }, { v: 'food-beverage', l: 'F&B' }]} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Full-time available?</label><Segmented value={fullTime === null ? '' : fullTime ? 'yes' : 'no'} onChange={v => setFullTime(v === 'yes')} options={[{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }]} /></div>
                  <div><label className={lbl}>Multi-site interest?</label><Segmented value={multiSite ? 'yes' : 'no'} onChange={v => setMultiSite(v === 'yes')} options={[{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }]} /></div>
                </div>
              </div>
            )}

            {section === 'locations' && (
              <div className="space-y-4">
                <div><label className={lbl}>Cities</label><div className="flex flex-wrap gap-2">{UK_CITIES.map(c => <Pill key={c.value} on={locations.includes(c.value)} onClick={() => tgl(locations, setLocations, c.value)}>{c.label}</Pill>)}</div></div>
                <div><label className={lbl}>Other locations <span className="text-ink-3 font-normal text-xs">— comma-separated</span></label><input value={otherLocation} onChange={e => setOtherLocation(e.target.value)} placeholder="e.g. Brighton, Oxford, Bath" className={inp} /></div>
              </div>
            )}

            {section === 'interests' && (
              <div className="space-y-5">
                <div><label className={lbl}>Franchise formats <span className="text-ink-3 font-normal text-xs">— what are you open to?</span></label><div className="flex flex-wrap gap-2">{FORMAT_TYPES.map(o => <Pill key={o.value} on={formatTypes.includes(o.value)} onClick={() => tgl(formatTypes, setFormatTypes, o.value)}>{o.label}</Pill>)}</div></div>
                <div><label className={lbl}>Sector interests</label><div className="flex flex-wrap gap-2">{SECTORS.map(s => <Pill key={s.value} on={sectors.includes(s.value)} onClick={() => tgl(sectors, setSectors, s.value)}>{s.label}</Pill>)}</div></div>
              </div>
            )}

            {section === 'goals' && (
              <div>
                <label className={lbl}>Goals & background</label>
                <textarea value={goals} onChange={e => setGoals(e.target.value)} rows={5} placeholder="Tell us what you're looking to achieve, your background, and anything else that's important to you…" className={`${inp} resize-none`} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-20 mt-5">
        <div className="flex items-center gap-3 bg-surface/95 backdrop-blur border border-line rounded-2xl shadow-[0_10px_30px_rgba(27,33,26,0.12)] px-4 py-3">
          <span className={cn('flex items-center gap-2 text-sm font-medium', dirty ? 'text-ff-gold-ink' : 'text-ink-3')}>
            <span className={cn('w-2 h-2 rounded-full', dirty ? 'bg-ff-gold' : 'bg-ink-3/40')} />
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <div className="ml-auto flex items-center gap-3">
            {saved && <span className="flex items-center gap-1 text-sm text-ff-green font-medium"><CheckIcon className="w-4 h-4" /> Saved</span>}
            <button type="submit" disabled={saving || !dirty} className="bg-ff-green hover:brightness-110 text-white font-medium py-2.5 px-6 rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm">{saving ? 'Saving…' : 'Save profile'}</button>
          </div>
        </div>
      </div>
    </form>
  )
}
