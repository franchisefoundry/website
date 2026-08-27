'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Ring } from '@/components/ui/Ring'
import { UK_CITIES, SECTORS } from '@/lib/supabase/types'
import type { FranchisorProfile } from '@/lib/supabase/types'
import { slugify, cn } from '@/lib/utils'
import { ShieldCheckIcon, CheckIcon } from '@/components/icons'

interface Props {
  brandProfile: FranchisorProfile | null
  userId: string
}

const inp = 'w-full px-3 py-2.5 rounded-xl text-sm text-ink bg-surface-2 border border-transparent hover:bg-[#f2f4ed] focus:bg-surface focus:border-ff-green focus:outline-none focus:ring-[3px] focus:ring-ff-green/10 transition placeholder:text-ink-3'
const lbl = 'block text-sm font-medium text-ink-2 mb-1.5'

const SECTIONS = [
  { id: 'basics', label: 'Basics' },
  { id: 'investment', label: 'Investment' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'coverage', label: 'Coverage & sectors' },
] as const

function Toggle({ on, onClick, children, pill }: { on: boolean; onClick: () => void; children: React.ReactNode; pill?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`${pill ? 'rounded-full px-3.5 py-1.5' : 'flex-1 rounded-xl px-3 py-2'} text-sm border transition-colors ${
        on ? 'bg-ff-green text-white border-ff-green shadow-sm' : 'border-line text-ink-2 hover:border-[#cdd2c8]'}`}>
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
    setSaving(false); setSaved(true)
    if (submitForReview) setSubmitRequested(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  const cleanHighlights = highlights.filter(Boolean)
  const investDisplay = investmentMin && investmentMax
    ? `£${parseInt(investmentMin).toLocaleString('en-GB')} – £${parseInt(investmentMax).toLocaleString('en-GB')}`
    : 'Investment to be confirmed'
  const filled = [brandName, category, teaser, investmentMin, timelineMonths, cleanHighlights.length > 0,
    locations.length > 0, sectorTags.length > 0, operatorModel, experienceRequired].filter(Boolean).length
  const strength = Math.round((filled / 10) * 100)

  // Per-section completeness dot
  const sectionDone: Record<string, boolean> = {
    basics: !!(brandName && category && teaser),
    investment: !!(investmentMin && investmentMax),
    requirements: !!(operatorModel && experienceRequired),
    coverage: locations.length > 0 && sectorTags.length > 0,
  }

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
                {sectionDone[s.id] ? '✓' : i + 1}
              </span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Active section fields */}
        <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] overflow-hidden min-w-0">
          <div className="px-5 sm:px-6 py-5">
            {section === 'basics' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Brand name</label><input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Sides, Zambrero" className={inp} /></div>
                  <div><label className={lbl}>Category</label><input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Quick Service, Coffee" className={inp} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-ink-2">Concept teaser <span className="text-ink-3 font-normal text-xs">— shown without naming the brand</span></label>
                    <button type="button" onClick={() => setAiHint(v => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-ff-gold-ink bg-ff-gold-soft border border-[#e6cfa6] rounded-full px-2.5 py-1 hover:brightness-105 transition">✨ Draft with AI</button>
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
                <div><label className={lbl}>Operator model</label><div className="flex flex-col sm:flex-row gap-2">{[['owner-operator', 'Owner-operator'], ['hire-manager', 'Hire a manager'], ['either', 'Either works']].map(([v, l]) => <Toggle key={v} on={operatorModel === v} onClick={() => setOperatorModel(v)}>{l}</Toggle>)}</div></div>
                <div><label className={lbl}>Experience required</label><div className="flex flex-col sm:flex-row gap-2">{[['none', 'None — first-timers'], ['management', 'Some management'], ['food-beverage', 'F&B background']].map(([v, l]) => <Toggle key={v} on={experienceRequired === v} onClick={() => setExperienceRequired(v)}>{l}</Toggle>)}</div></div>
                <div><label className={lbl}>Site format(s)</label><div className="flex gap-2 flex-wrap">{[['dine-in', 'Dine-in'], ['takeaway', 'Takeaway'], ['kiosk', 'Kiosk / bar'], ['flexible', 'Flexible']].map(([v, l]) => <Toggle key={v} pill on={format.includes(v)} onClick={() => tgl(format, setFormat, v)}>{l}</Toggle>)}</div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Full-time required?</label><div className="flex gap-2"><Toggle on={fullTimeRequired} onClick={() => setFullTimeRequired(true)}>Yes</Toggle><Toggle on={!fullTimeRequired} onClick={() => setFullTimeRequired(false)}>No</Toggle></div></div>
                  <div><label className={lbl}>Multi-site ready?</label><div className="flex gap-2"><Toggle on={multiSiteReady} onClick={() => setMultiSiteReady(true)}>Yes</Toggle><Toggle on={!multiSiteReady} onClick={() => setMultiSiteReady(false)}>No</Toggle></div></div>
                </div>
              </div>
            )}

            {section === 'coverage' && (
              <div className="space-y-4">
                <div><label className={lbl}>Cities available</label><div className="flex flex-wrap gap-2">{UK_CITIES.map(c => <Toggle key={c.value} pill on={locations.includes(c.value)} onClick={() => tgl(locations, setLocations, c.value)}>{c.label}</Toggle>)}</div></div>
                <div><label className={lbl}>Display text <span className="text-ink-3 font-normal text-xs">— shown to candidates</span></label><input value={locationsDisplay} onChange={e => setLocationsDisplay(e.target.value)} placeholder="e.g. Major UK cities" className={inp} /></div>
                <div><label className={lbl}>Sector tags</label><div className="flex flex-wrap gap-2">{SECTORS.map(s => <Toggle key={s.value} pill on={sectorTags.includes(s.value)} onClick={() => tgl(sectorTags, setSectorTags, s.value)}>{s.label}</Toggle>)}</div></div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 bg-surface-2 border-t border-line-2">
            <button type="submit" disabled={saving} className="bg-ff-green hover:brightness-110 text-white font-medium py-2.5 px-6 rounded-xl text-sm transition-all disabled:opacity-60 shadow-sm">{saving ? 'Saving…' : 'Save changes'}</button>
            {brandProfile?.status === 'draft' && (
              <button type="button" onClick={e => handleSave(e as unknown as React.FormEvent, true)} disabled={saving || !brandName} className="border border-ff-green text-ff-green hover:bg-ff-green hover:text-white font-medium py-2.5 px-6 rounded-xl text-sm transition-colors disabled:opacity-60">Submit for review</button>
            )}
            {saved && <span className="text-sm text-ff-green font-medium">{submitRequested ? 'Submitted ✓' : 'Saved ✓'}</span>}
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
          <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-4 flex items-center gap-4">
            <Ring pct={strength} size={72} />
            <div>
              <p className="text-sm font-bold text-ink">Profile strength</p>
              {strength < 100 ? <p className="text-xs text-ff-gold-ink font-semibold mt-1">Finish the remaining sections</p> : <p className="text-xs text-ink-2 mt-1">Complete — great work</p>}
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
