'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Ring } from '@/components/ui/Ring'
import { UK_CITIES, SECTORS } from '@/lib/supabase/types'
import type { FranchisorProfile } from '@/lib/supabase/types'
import { slugify, cn } from '@/lib/utils'
import { ShieldCheckIcon, CheckIcon, SparklesIcon, ArrowRightIcon } from '@/components/icons'

interface Props {
  brandProfile: FranchisorProfile | null
  userId: string
}

const inp = 'w-full px-3 py-2.5 rounded-xl text-sm text-ink bg-surface-2 border border-transparent hover:bg-[#f2f4ed] focus:bg-surface focus:border-ff-green focus:outline-none focus:ring-[3px] focus:ring-ff-green/10 transition placeholder:text-ink-3'
const lbl = 'block text-sm font-medium text-ink-2 mb-1.5'

const SECTIONS = [
  { id: 'basics', label: 'Basics', title: 'Basics', help: "The essentials candidates see first — name, category and your hook." },
  { id: 'investment', label: 'Investment', title: 'Investment', help: "The numbers candidates are matched on." },
  { id: 'requirements', label: 'Requirements', title: 'Requirements', help: "Who you're looking for and how sites are run." },
  { id: 'coverage', label: 'Coverage', title: 'Coverage & sectors', help: "Where you can open, and which sectors you fit." },
] as const

/** Single-select segmented control with a sliding highlight (Linear/iOS feel). */
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
          className={cn('relative z-10 flex-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap',
            value === o.v ? 'text-white' : 'text-ink-2 hover:text-ink')}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

/** Multi-select pill. */
function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('rounded-full px-3.5 py-1.5 text-sm border transition-colors',
        on ? 'bg-ff-green text-white border-ff-green shadow-sm' : 'border-line text-ink-2 hover:border-[#cdd2c8]')}>
      {children}
    </button>
  )
}

export default function BrandProfileForm({ brandProfile, userId }: Props) {
  const router = useRouter()
  const [section, setSection] = useState<string>('basics')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitRequested, setSubmitRequested] = useState(false)
  const [aiHint, setAiHint] = useState(false)

  const [brandName, setBrandName] = useState(brandProfile?.brand_name ?? '')
  const [category, setCategory] = useState(brandProfile?.category ?? '')
  const [teaser, setTeaser] = useState(brandProfile?.teaser ?? '')
  const [investmentMin, setInvestmentMin] = useState(brandProfile?.investment_min?.toString() ?? '')
  const [investmentMax, setInvestmentMax] = useState(brandProfile?.investment_max?.toString() ?? '')
  const [locations, setLocations] = useState<string[]>(brandProfile?.locations_available ?? [])
  const [locationsDisplay, setLocationsDisplay] = useState(brandProfile?.locations_display ?? '')
  const [sectorTags, setSectorTags] = useState<string[]>(brandProfile?.sectors ?? [])
  const [timelineMonths, setTimelineMonths] = useState(brandProfile?.timeline_months?.toString() ?? '')
  const [highlights, setHighlights] = useState<string[]>(brandProfile?.highlights?.length ? brandProfile.highlights : ['', '', ''])
  const [operatorModel, setOperatorModel] = useState(brandProfile?.operator_model ?? '')
  const [format, setFormat] = useState<string[]>(brandProfile?.format ?? [])
  const [experienceRequired, setExperienceRequired] = useState(brandProfile?.experience_required ?? '')
  const [multiSiteReady, setMultiSiteReady] = useState(brandProfile?.multi_site_ready ?? false)
  const [fullTimeRequired, setFullTimeRequired] = useState(brandProfile?.full_time_required ?? true)

  const tgl = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])

  // Dirty tracking — compare a serialized snapshot to the saved baseline.
  const snapshot = JSON.stringify({ brandName, category, teaser, investmentMin, investmentMax, locations, locationsDisplay, sectorTags, timelineMonths, highlights, operatorModel, format, experienceRequired, multiSiteReady, fullTimeRequired })
  const [baseline, setBaseline] = useState(snapshot)
  const dirty = snapshot !== baseline

  async function handleSave(e: React.FormEvent, submitForReview = false) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const slug = brandProfile?.slug || slugify(brandName)
    const updates: Partial<FranchisorProfile> = {
      brand_name: brandName, slug, category, teaser,
      investment_min: investmentMin ? parseInt(investmentMin) : null,
      investment_max: investmentMax ? parseInt(investmentMax) : null,
      investment_display: investmentMin && investmentMax
        ? `£${parseInt(investmentMin).toLocaleString('en-GB')} – £${parseInt(investmentMax).toLocaleString('en-GB')}` : null,
      locations_available: locations, locations_display: locationsDisplay || null,
      sectors: sectorTags, timeline_months: timelineMonths ? parseInt(timelineMonths) : null,
      highlights: highlights.filter(Boolean),
      operator_model: operatorModel as FranchisorProfile['operator_model'] || null,
      format, experience_required: experienceRequired as FranchisorProfile['experience_required'] || null,
      multi_site_ready: multiSiteReady, full_time_required: fullTimeRequired,
      ...(submitForReview ? { status: 'pending_review' } : {}),
    }
    if (brandProfile) await supabase.from('franchisor_profiles').update(updates).eq('id', brandProfile.id)
    else await supabase.from('franchisor_profiles').insert({ ...updates, user_id: userId, status: 'draft' })
    setSaving(false); setSaved(true); setBaseline(snapshot)
    if (submitForReview) setSubmitRequested(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  const cleanHighlights = highlights.filter(Boolean)
  const investDisplay = investmentMin && investmentMax
    ? `£${parseInt(investmentMin).toLocaleString('en-GB')} – £${parseInt(investmentMax).toLocaleString('en-GB')}`
    : 'Investment to be confirmed'

  // Actionable completeness checklist — each item jumps to its section.
  const checklist: { label: string; done: boolean; section: string }[] = [
    { label: 'Brand name', done: !!brandName, section: 'basics' },
    { label: 'Category', done: !!category, section: 'basics' },
    { label: 'Concept teaser', done: !!teaser, section: 'basics' },
    { label: 'At least one highlight', done: cleanHighlights.length > 0, section: 'basics' },
    { label: 'Investment range', done: !!(investmentMin && investmentMax), section: 'investment' },
    { label: 'Setup timeline', done: !!timelineMonths, section: 'investment' },
    { label: 'Operator model', done: !!operatorModel, section: 'requirements' },
    { label: 'Experience required', done: !!experienceRequired, section: 'requirements' },
    { label: 'Cities available', done: locations.length > 0, section: 'coverage' },
    { label: 'Sector tags', done: sectorTags.length > 0, section: 'coverage' },
  ]
  const doneCount = checklist.filter(c => c.done).length
  const strength = Math.round((doneCount / checklist.length) * 100)
  const missing = checklist.filter(c => !c.done)

  const sectionDone: Record<string, boolean> = {
    basics: !!(brandName && category && teaser),
    investment: !!(investmentMin && investmentMax),
    requirements: !!(operatorModel && experienceRequired),
    coverage: locations.length > 0 && sectorTags.length > 0,
  }

  const cur = SECTIONS.find(s => s.id === section)!

  return (
    <form onSubmit={e => handleSave(e)}>
      {brandProfile?.status === 'active' && (
        <div className="bg-ff-green-soft border border-ff-green/20 rounded-2xl px-5 py-3 text-sm text-ff-green mb-5">
          Your brand profile is live. Changes you save are reviewed by the Franchise Foundry team.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[172px_1fr_300px] gap-5 items-start">
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
        </nav>

        {/* Active section */}
        <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] overflow-hidden min-w-0">
          <div className="px-5 sm:px-6 py-5">
            <div className="mb-5">
              <h3 className="text-base font-bold text-ink tracking-[-0.01em]">{cur.title}</h3>
              <p className="text-xs text-ink-2 mt-0.5">{cur.help}</p>
            </div>

            {section === 'basics' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Brand name</label><input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Sides, Zambrero" className={inp} /></div>
                  <div><label className={lbl}>Category</label><input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Quick Service, Coffee" className={inp} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-ink-2">Concept teaser <span className="text-ink-3 font-normal text-xs">— shown without naming the brand</span></label>
                    <button type="button" onClick={() => setAiHint(v => !v)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ff-gold-ink bg-ff-gold-soft border border-[#e6cfa6] rounded-full px-2.5 py-1 hover:brightness-105 transition"><SparklesIcon className="w-3.5 h-3.5" /> Draft with AI</button>
                  </div>
                  {aiHint && <p className="text-xs text-ff-gold-ink bg-ff-gold-soft/60 border border-[#e6cfa6] rounded-lg px-3 py-2 mb-2">Coming soon — AI will suggest a teaser and highlights from a few words about your concept.</p>}
                  <textarea value={teaser} onChange={e => setTeaser(e.target.value)} rows={3} placeholder="What makes your concept distinctive — the proposition and model." className={`${inp} resize-none`} />
                </div>
                <div>
                  <label className={lbl}>Key highlights (up to 3)</label>
                  <div className="space-y-2">
                    {highlights.map((h, i) => <input key={i} value={h} onChange={e => { const u = [...highlights]; u[i] = e.target.value; setHighlights(u) }} placeholder={`Highlight ${i + 1} — e.g. No experience required`} className={inp} />)}
                  </div>
                </div>
              </div>
            )}

            {section === 'investment' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className={lbl}>Minimum (£)</label><input type="number" value={investmentMin} onChange={e => setInvestmentMin(e.target.value)} placeholder="150000" className={inp} /></div>
                <div><label className={lbl}>Maximum (£)</label><input type="number" value={investmentMax} onChange={e => setInvestmentMax(e.target.value)} placeholder="300000" className={inp} /></div>
                <div><label className={lbl}>Setup timeline (months)</label><input type="number" value={timelineMonths} onChange={e => setTimelineMonths(e.target.value)} placeholder="6" className={inp} /></div>
              </div>
            )}

            {section === 'requirements' && (
              <div className="space-y-5">
                <div><label className={lbl}>Operator model</label><Segmented value={operatorModel} onChange={setOperatorModel} options={[{ v: 'owner-operator', l: 'Owner-operator' }, { v: 'hire-manager', l: 'Hire a manager' }, { v: 'either', l: 'Either works' }]} /></div>
                <div><label className={lbl}>Experience required</label><Segmented value={experienceRequired} onChange={setExperienceRequired} options={[{ v: 'none', l: 'None' }, { v: 'management', l: 'Some management' }, { v: 'food-beverage', l: 'F&B background' }]} /></div>
                <div><label className={lbl}>Site format(s)</label><div className="flex gap-2 flex-wrap">{[['dine-in', 'Dine-in'], ['takeaway', 'Takeaway'], ['kiosk', 'Kiosk / bar'], ['flexible', 'Flexible']].map(([v, l]) => <Pill key={v} on={format.includes(v)} onClick={() => tgl(format, setFormat, v)}>{l}</Pill>)}</div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Full-time required?</label><Segmented value={fullTimeRequired ? 'yes' : 'no'} onChange={v => setFullTimeRequired(v === 'yes')} options={[{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }]} /></div>
                  <div><label className={lbl}>Multi-site ready?</label><Segmented value={multiSiteReady ? 'yes' : 'no'} onChange={v => setMultiSiteReady(v === 'yes')} options={[{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }]} /></div>
                </div>
              </div>
            )}

            {section === 'coverage' && (
              <div className="space-y-4">
                <div><label className={lbl}>Cities available</label><div className="flex flex-wrap gap-2">{UK_CITIES.map(c => <Pill key={c.value} on={locations.includes(c.value)} onClick={() => tgl(locations, setLocations, c.value)}>{c.label}</Pill>)}</div></div>
                <div><label className={lbl}>Display text <span className="text-ink-3 font-normal text-xs">— shown to candidates</span></label><input value={locationsDisplay} onChange={e => setLocationsDisplay(e.target.value)} placeholder="e.g. Major UK cities" className={inp} /></div>
                <div><label className={lbl}>Sector tags</label><div className="flex flex-wrap gap-2">{SECTORS.map(s => <Pill key={s.value} on={sectorTags.includes(s.value)} onClick={() => tgl(sectorTags, setSectorTags, s.value)}>{s.label}</Pill>)}</div></div>
              </div>
            )}
          </div>
        </div>

        {/* Preview + strength */}
        <div className="lg:sticky lg:top-4 space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-2.5">How candidates see you</p>
            <div className="bg-surface border border-line rounded-2xl shadow-[0_14px_34px_rgba(27,33,26,0.1)] overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-ff-gold to-[#e8c9a0]" />
              <div className="p-5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ff-green bg-ff-green/10 rounded-full px-2.5 py-1 mb-3"><ShieldCheckIcon className="w-3.5 h-3.5" /> Vetted by Franchise Foundry</span>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{category || 'Category'}</p>
                <p className="text-sm text-ink-2 mt-2 leading-relaxed min-h-[38px]">{teaser || 'Your teaser appears here — what candidates read before the brand is revealed.'}</p>
                <p className="text-lg font-bold text-ink mt-3 tabular-nums">{investDisplay}</p>
                {locationsDisplay && <p className="text-xs text-ink-3 mt-0.5">{locationsDisplay}</p>}
                {cleanHighlights.length > 0 && <ul className="mt-4 space-y-2">{cleanHighlights.map((h, i) => <li key={i} className="flex items-start gap-2 text-sm text-ink-2"><CheckIcon className="w-4 h-4 text-ff-gold mt-0.5 flex-shrink-0" />{h}</li>)}</ul>}
              </div>
            </div>
          </div>

          {/* Actionable profile strength */}
          <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-4">
            <div className="flex items-center gap-4">
              <Ring pct={strength} size={72} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">Profile strength</p>
                {strength < 100
                  ? <p className="text-xs text-ff-gold-ink font-semibold mt-1">{missing.length} {missing.length === 1 ? 'thing' : 'things'} left to add</p>
                  : <p className="text-xs text-ink-2 mt-1">Complete — great work</p>}
              </div>
            </div>
            {missing.length > 0 && (
              <ul className="mt-3 pt-3 border-t border-line-2 space-y-0.5">
                {missing.map(m => (
                  <li key={m.label}>
                    <button type="button" onClick={() => setSection(m.section)}
                      className="group w-full flex items-center gap-2 text-left text-sm text-ink-2 hover:text-ff-green rounded-lg px-2 py-1.5 hover:bg-ff-green/5 transition-colors">
                      <span className="w-4 h-4 rounded-full border border-[#cdd2c8] flex-shrink-0" />
                      <span className="flex-1">{m.label}</span>
                      <ArrowRightIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </li>
                ))}
              </ul>
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
            {saved && <span className="flex items-center gap-1 text-sm text-ff-green font-medium"><CheckIcon className="w-4 h-4" /> {submitRequested ? 'Submitted' : 'Saved'}</span>}
            {brandProfile?.status === 'draft' && (
              <button type="button" onClick={e => handleSave(e as unknown as React.FormEvent, true)} disabled={saving || !brandName} className="border border-ff-green text-ff-green hover:bg-ff-green hover:text-white font-medium py-2.5 px-5 rounded-xl text-sm transition-colors disabled:opacity-50">Submit for review</button>
            )}
            <button type="submit" disabled={saving || !dirty} className="bg-ff-green hover:brightness-110 text-white font-medium py-2.5 px-6 rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm">{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </div>
    </form>
  )
}
