'use client'

import { useState } from 'react'
import { DualRangeSlider, INVESTMENT_STEPS } from '@/components/questionnaire/DualRangeSlider'
import { SingleSlider } from '@/components/questionnaire/SingleSlider'
import { SpectrumSlider } from '@/components/questionnaire/SpectrumSlider'
import { GradientRating } from '@/components/questionnaire/GradientRating'
import { StepBuilder } from '@/components/questionnaire/StepBuilder'
import { OperatingModelCards } from '@/components/questionnaire/OperatingModelCards'

interface Props {
  franchisorId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existing: Record<string, any> | null
}

const APPROVAL_FACTOR_OPTIONS = [
  'Financial strength / liquidity',
  'Relevant business or management experience',
  'Alignment with brand values',
  'Commitment and motivation',
  'Location / territory fit',
  'Previous franchising experience',
  'Entrepreneurial mindset',
  'Communication and coachability',
]

const DECLINE_REASON_OPTIONS = [
  'Insufficient capital',
  'Wrong mindset / attitude',
  'Unrealistic expectations',
  'Poor location or territory',
  'Lack of relevant experience',
  'Failed background / credit check',
  'Values mismatch',
  'Overqualified / poor fit',
]

const INQUIRY_CHANNEL_OPTIONS = [
  'Franchise portals (e.g. Franchise Direct)',
  'Referrals from existing franchisees',
  'Social media / paid ads',
  'PR and press coverage',
  'Word of mouth',
  'Franchise Foundry',
  'Events / expos',
  'Website / organic search',
]

const FORMAT_OPTIONS = ['dine-in', 'takeaway', 'kiosk', 'delivery', 'flexible']
const FORMAT_LABELS: Record<string, string> = { 'dine-in': '🍽️ Dine-in', takeaway: '🥡 Takeaway', kiosk: '🏪 Kiosk', delivery: '🚴 Delivery', flexible: '🔄 Flexible' }

const UK_CITY_OPTIONS = [
  'london', 'manchester', 'birmingham', 'leeds', 'liverpool',
  'glasgow', 'edinburgh', 'bristol', 'sheffield', 'nottingham',
  'cardiff', 'leicester', 'coventry', 'bradford', 'belfast',
]

const EXPERIENCE_OPTIONS = [
  { value: 'none',           label: 'No prior experience required' },
  { value: 'management',    label: 'Management experience preferred' },
  { value: 'food-beverage', label: 'Food & beverage background needed' },
]

function Textarea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  // Local state so every keystroke doesn't re-render the whole form.
  // Parent is notified on blur — safe because blur fires before save button clicks.
  const [local, setLocal] = useState(value)
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <textarea
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none text-slate-800 placeholder:text-slate-400"
      />
    </div>
  )
}

function MultiSelect({ label, options, selected, onChange }: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt])
  }
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              selected.includes(opt)
                ? 'bg-brand-green text-white border-brand-green'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex gap-2">
        {[{ l: 'Yes', v: true }, { l: 'No', v: false }].map(opt => (
          <button key={opt.l} type="button" onClick={() => onChange(opt.v)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm border transition-colors font-medium ${
              value === opt.v ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}>
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  )
}

function SliderField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-3">{hint}</p>}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        {children}
      </div>
    </div>
  )
}

function SectionCard({ title, children, onSave, saving, saved }: {
  title: string
  children: React.ReactNode
  onSave: () => void
  saving: boolean
  saved: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-slate-800 text-sm">{title}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-slate-100 pt-5 space-y-5">
          {children}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2 px-5 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function nearestStep(val: number) {
  const exact = INVESTMENT_STEPS.indexOf(val)
  if (exact >= 0) return val
  return INVESTMENT_STEPS.reduce((best, s) =>
    Math.abs(s - val) < Math.abs(best - val) ? s : best, INVESTMENT_STEPS[0])
}

export default function QuestionnaireForm({ franchisorId, existing }: Props) {
  const e = existing ?? {}

  // Section 1
  const [coreModel, setCoreModel] = useState<string>(e.core_model ?? '')
  const [compAdvantage, setCompAdvantage] = useState<string>(e.competitive_advantage ?? '')
  const [revenueStreams, setRevenueStreams] = useState<string>(e.revenue_streams ?? '')
  const [highPerforming, setHighPerforming] = useState<string>(e.high_performing_unit ?? '')
  const [underperformance, setUnderperformance] = useState<string>(e.underperformance_reasons ?? '')

  // Section 2 — investment slider + text notes + remaining fields
  const [investmentMin, setInvestmentMin] = useState<number>(nearestStep(e.investment_min ?? 20_000))
  const [investmentMax, setInvestmentMax] = useState<number>(nearestStep(e.investment_max ?? 100_000))
  const [investmentNotes, setInvestmentNotes] = useState<string>(e.investment_range_raw ?? '')
  const [liquidCapitalMin, setLiquidCapitalMin] = useState<number>(e.liquid_capital_min ?? 20_000)
  const [commercialRates, setCommercialRates] = useState<string>(e.commercial_rates ?? '')
  const [financialMetrics, setFinancialMetrics] = useState<string>(e.financial_metrics_shared ?? '')
  const [breakEvenMonths, setBreakEvenMonths] = useState<number>(e.break_even_months ?? 18)
  const [breakEvenNotes, setBreakEvenNotes] = useState<string>(e.break_even_timeline ?? '')
  const [underestimatedCosts, setUnderestimatedCosts] = useState<string>(e.underestimated_costs ?? '')
  const [commonObjections, setCommonObjections] = useState<string>(e.common_objections ?? '')

  // Section 3
  const [idealFranchisee, setIdealFranchisee] = useState<string>(e.ideal_franchisee_profile ?? '')
  const [backgroundExp, setBackgroundExp] = useState<string>(e.background_experience ?? '')
  const [experienceRequired, setExperienceRequired] = useState<string>(e.experience_required ?? '')
  const [fullTimeRequired, setFullTimeRequired] = useState<boolean | null>(e.full_time_required ?? null)
  const [singleLicence, setSingleLicence] = useState<boolean | null>(e.single_franchise_licenses ?? null)
  const [operatingModel, setOperatingModel] = useState<string>(e.operating_model_raw ?? '')
  const [approvalFactors, setApprovalFactors] = useState<string[]>(e.approval_factors ?? [])
  const [declineReasons, setDeclineReasons] = useState<string[]>(e.decline_reasons ?? [])
  const [problematicBehaviours, setProblematicBehaviours] = useState<string>(e.problematic_behaviours ?? '')
  const [successDef, setSuccessDef] = useState<string>(e.success_definition ?? '')

  // Section 4 — growth slider + territory + spectrum + new matching fields
  const [locationsAvailable, setLocationsAvailable] = useState<string[]>(e.locations_available ?? [])
  const [growthTargetUnits, setGrowthTargetUnits] = useState<number>(e.growth_target_units ?? 5)
  const [growthContext, setGrowthContext] = useState<string>(e.annual_growth_targets ?? '')
  const [territories, setTerritories] = useState<string>(e.priority_territories ?? '')
  const [growthQualityScore, setGrowthQualityScore] = useState<number>(e.growth_quality_score ?? 50)
  const [scalingConcerns, setScalingConcerns] = useState<string>(e.scaling_concerns ?? '')
  const [timelineMonths, setTimelineMonths] = useState<number>(e.timeline_months ?? 6)
  const [formatTypes, setFormatTypes] = useState<string[]>(e.format_types ?? [])

  // Section 5
  const [inquiryChannels, setInquiryChannels] = useState<string[]>(e.inquiry_channels ?? [])
  const rawSteps = e.screening_steps
  const [screeningSteps, setScreeningSteps] = useState<string[]>(
    Array.isArray(rawSteps) && rawSteps.length
      ? rawSteps
      : e.screening_method
        ? [e.screening_method]
        : ['Initial enquiry call', 'Application form', 'Discovery day']
  )
  const [approvalTiming, setApprovalTiming] = useState<string>(e.approval_timing ?? '')
  const [approvalAuthority, setApprovalAuthority] = useState<string>(e.approval_authority ?? '')
  const [timelineContract, setTimelineContract] = useState<string>(e.timeline_inquiry_to_contract ?? '')
  const [postSigning, setPostSigning] = useState<string>(e.post_signing_activities ?? '')
  const [timelineLaunch, setTimelineLaunch] = useState<string>(e.timeline_signing_to_launch ?? '')
  const [bottlenecks, setBottlenecks] = useState<string>(e.process_bottlenecks ?? '')
  const [rating, setRating] = useState<number>(e.recruitment_process_rating ?? 0)

  const [savingSection, setSavingSection] = useState<number | null>(null)
  const [savedSection, setSavedSection] = useState<number | null>(null)

  async function saveSection(section: number, payload: Record<string, unknown>) {
    setSavingSection(section)
    setSavedSection(null)
    try {
      const res = await fetch('/api/franchisor/questionnaire', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ franchisorId, updates: payload }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        console.error('Save error:', error)
      } else {
        setSavedSection(section)
        setTimeout(() => setSavedSection(null), 3000)
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSavingSection(null)
    }
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {/* 1 · The Business */}
      <SectionCard
        title="1 · The Business"
        onSave={() => saveSection(1, {
          core_model: coreModel,
          competitive_advantage: compAdvantage,
          revenue_streams: revenueStreams,
          high_performing_unit: highPerforming,
          underperformance_reasons: underperformance,
        })}
        saving={savingSection === 1}
        saved={savedSection === 1}
      >
        <Textarea label="Core business model & day-to-day operations" value={coreModel} onChange={setCoreModel} placeholder="What does a franchisee actually do each day?..." rows={4} />
        <Textarea label="Competitive advantage" value={compAdvantage} onChange={setCompAdvantage} placeholder="Why would a customer choose you?..." />
        <Textarea label="Revenue streams" value={revenueStreams} onChange={setRevenueStreams} placeholder="Dine-in, delivery, catering, merchandise..." rows={2} />
        <Textarea label="High-performing unit metrics" value={highPerforming} onChange={setHighPerforming} placeholder="Revenue, team size, footfall..." />
        <Textarea label="Common reasons for underperformance" value={underperformance} onChange={setUnderperformance} placeholder="Location, franchisee engagement..." />
      </SectionCard>

      {/* 2 · Financials */}
      <SectionCard
        title="2 · Financials"
        onSave={() => saveSection(2, {
          investment_min: investmentMin,
          investment_max: investmentMax,
          investment_range_raw: investmentNotes || null,
          liquid_capital_min: liquidCapitalMin,
          commercial_rates: commercialRates,
          financial_metrics_shared: financialMetrics,
          break_even_months: breakEvenMonths,
          break_even_timeline: breakEvenNotes || null,
          underestimated_costs: underestimatedCosts,
          common_objections: commonObjections,
        })}
        saving={savingSection === 2}
        saved={savedSection === 2}
      >
        <SliderField
          label="Total investment range"
          hint="Drag the handles to set your minimum and maximum investment levels"
        >
          <DualRangeSlider
            min={investmentMin}
            max={investmentMax}
            onChange={(mn, mx) => { setInvestmentMin(mn); setInvestmentMax(mx) }}
            variant="light"
          />
        </SliderField>
        <Textarea label="Investment breakdown notes" value={investmentNotes} onChange={setInvestmentNotes} placeholder="e.g. Franchise fee £25k, fit-out £40k, working capital £15k..." rows={2} />
        <SliderField
          label="Minimum liquid capital required"
          hint="Cash a franchisee must have available on day one — separate from financed investment"
        >
          <SingleSlider
            value={liquidCapitalMin}
            min={5000}
            max={200000}
            step={5000}
            format={v => `£${v.toLocaleString()}`}
            lowLabel="£5k"
            highLabel="£200k+"
            onChange={setLiquidCapitalMin}
            variant="light"
          />
        </SliderField>
        <Textarea label="Commercial terms (fee, royalty, levy)" value={commercialRates} onChange={setCommercialRates} placeholder="e.g. Franchise fee: £25k, Royalty: 7%..." rows={2} />
        <Textarea label="Financial data shared with prospects" value={financialMetrics} onChange={setFinancialMetrics} placeholder="P&L, average unit revenue, margins..." />
        <SliderField
          label="Typical break-even timeline"
          hint="Slide to select the average number of months to break even"
        >
          <SingleSlider
            value={breakEvenMonths}
            min={1}
            max={48}
            format={v => v === 48 ? '48+ months' : `${v} month${v === 1 ? '' : 's'}`}
            lowLabel="1 month"
            highLabel="48+ months"
            onChange={setBreakEvenMonths}
            variant="light"
          />
        </SliderField>
        <Textarea label="Break-even context / caveats" value={breakEvenNotes} onChange={setBreakEvenNotes} placeholder="Depends on location, prior experience..." rows={2} />
        <Textarea label="Most underestimated costs" value={underestimatedCosts} onChange={setUnderestimatedCosts} placeholder="Staffing, working capital buffer, rates..." />
        <Textarea label="Common financial objections" value={commonObjections} onChange={setCommonObjections} placeholder="'The fee is too high', 'Payback is too long'..." />
      </SectionCard>

      {/* 3 · Ideal Franchisee */}
      <SectionCard
        title="3 · Ideal Franchisee"
        onSave={() => saveSection(3, {
          ideal_franchisee_profile: idealFranchisee,
          background_experience: backgroundExp,
          experience_required: experienceRequired || null,
          full_time_required: fullTimeRequired,
          single_franchise_licenses: singleLicence,
          operating_model_raw: operatingModel || null,
          approval_factors: approvalFactors,
          decline_reasons: declineReasons,
          problematic_behaviours: problematicBehaviours,
          success_definition: successDef,
        })}
        saving={savingSection === 3}
        saved={savedSection === 3}
      >
        <Textarea label="Ideal franchisee profile" value={idealFranchisee} onChange={setIdealFranchisee} placeholder="Age range, background, personality, motivations..." />
        <Textarea label="Required or preferred experience" value={backgroundExp} onChange={setBackgroundExp} placeholder="Management, F&B, business ownership..." rows={2} />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Minimum experience level required</label>
          <div className="space-y-2">
            {EXPERIENCE_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setExperienceRequired(opt.value)}
                className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                  experienceRequired === opt.value ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <YesNo label="Is full-time commitment required?" value={fullTimeRequired} onChange={setFullTimeRequired} />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Operating model</label>
          <OperatingModelCards value={operatingModel} onChange={setOperatingModel} variant="light" />
        </div>
        <YesNo label="Do you grant single-location franchise licences?" value={singleLicence} onChange={setSingleLicence} />
        <MultiSelect label="Top approval factors" options={APPROVAL_FACTOR_OPTIONS} selected={approvalFactors} onChange={setApprovalFactors} />
        <MultiSelect label="Common decline reasons" options={DECLINE_REASON_OPTIONS} selected={declineReasons} onChange={setDeclineReasons} />
        <Textarea label="Types of franchisee that haven't worked well" value={problematicBehaviours} onChange={setProblematicBehaviours} placeholder="Behaviours, mindsets, backgrounds to avoid..." />
        <Textarea label="How you define franchisee success" value={successDef} onChange={setSuccessDef} placeholder="Beyond revenue — culture, brand, growth..." />
      </SectionCard>

      {/* 4 · Growth & Territory */}
      <SectionCard
        title="4 · Growth & Territory"
        onSave={() => saveSection(4, {
          format_types: formatTypes.length ? formatTypes : null,
          locations_available: locationsAvailable.length ? locationsAvailable : null,
          growth_target_units: growthTargetUnits,
          annual_growth_targets: growthContext || null,
          priority_territories: territories,
          growth_quality_score: growthQualityScore,
          growth_speed_vs_quality: null,
          scaling_concerns: scalingConcerns,
          timeline_months: timelineMonths,
        })}
        saving={savingSection === 4}
        saved={savedSection === 4}
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Franchise formats</label>
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map(fmt => (
              <button key={fmt} type="button"
                onClick={() => setFormatTypes(formatTypes.includes(fmt) ? formatTypes.filter(f => f !== fmt) : [...formatTypes, fmt])}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${formatTypes.includes(fmt) ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                {FORMAT_LABELS[fmt]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Active UK territories</label>
          <p className="text-xs text-slate-400 mb-2">Cities you are actively seeking franchisees in right now</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {UK_CITY_OPTIONS.map(city => (
              <button key={city} type="button"
                onClick={() => setLocationsAvailable(locationsAvailable.includes(city) ? locationsAvailable.filter(c => c !== city) : [...locationsAvailable, city])}
                className={`px-3 py-1.5 rounded-full text-sm border capitalize transition-colors ${locationsAvailable.includes(city) ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                {city.charAt(0).toUpperCase() + city.slice(1)}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Other locations (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Cambridge, Oxford, Brighton"
              defaultValue={locationsAvailable.filter(l => !UK_CITY_OPTIONS.includes(l)).join(', ')}
              onBlur={e => {
                const custom = e.target.value.split(',').map(l => l.trim().toLowerCase()).filter(Boolean)
                const presets = locationsAvailable.filter(l => UK_CITY_OPTIONS.includes(l))
                setLocationsAvailable([...presets, ...custom])
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
        </div>
        <SliderField
          label="Annual unit target"
          hint="How many new franchise units are you aiming to open per year?"
        >
          <SingleSlider
            value={growthTargetUnits}
            min={1}
            max={50}
            format={v => v === 50 ? '50+ units/year' : `${v} unit${v === 1 ? '' : 's'}/year`}
            lowLabel="1 unit"
            highLabel="50+ units"
            onChange={setGrowthTargetUnits}
            variant="light"
          />
        </SliderField>
        <Textarea label="Growth context & timeframe" value={growthContext} onChange={setGrowthContext} placeholder="e.g. 5–8 units/year, 25 total by 2027..." rows={2} />
        <Textarea label="Priority UK territories (detail)" value={territories} onChange={setTerritories} placeholder="Manchester, West Yorkshire, Glasgow..." rows={2} />
        <SliderField
          label="Growth philosophy — speed vs. quality"
          hint="Where does your approach sit on the spectrum?"
        >
          <SpectrumSlider
            value={growthQualityScore}
            onChange={setGrowthQualityScore}
            variant="light"
          />
        </SliderField>
        <Textarea label="Biggest scaling concern" value={scalingConcerns} onChange={setScalingConcerns} placeholder="Quality control, operational support, brand consistency..." />
        <SliderField
          label="Typical months from inquiry to opening"
          hint="Include training, fit-out, and launch preparation"
        >
          <SingleSlider
            value={timelineMonths}
            min={1}
            max={36}
            format={v => v === 36 ? '36+ months' : `${v} month${v === 1 ? '' : 's'}`}
            lowLabel="1 month"
            highLabel="36+ months"
            onChange={setTimelineMonths}
            variant="light"
          />
        </SliderField>
      </SectionCard>

      {/* 5 · Recruitment Process */}
      <SectionCard
        title="5 · Recruitment Process"
        onSave={() => saveSection(5, {
          inquiry_channels: inquiryChannels,
          screening_steps: screeningSteps,
          screening_method: screeningSteps.join('\n'), // backward compat
          approval_timing: approvalTiming,
          approval_authority: approvalAuthority,
          timeline_inquiry_to_contract: timelineContract,
          post_signing_activities: postSigning,
          timeline_signing_to_launch: timelineLaunch,
          process_bottlenecks: bottlenecks,
          recruitment_process_rating: rating || null,
        })}
        saving={savingSection === 5}
        saved={savedSection === 5}
      >
        <MultiSelect label="Where enquiries come from" options={INQUIRY_CHANNEL_OPTIONS} selected={inquiryChannels} onChange={setInquiryChannels} />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Screening process steps</label>
          <p className="text-xs text-slate-400 mb-3">Add each stage — hover a step to reorder or remove it</p>
          <StepBuilder steps={screeningSteps} onChange={setScreeningSteps} placeholder="Describe this step…" variant="light" />
        </div>
        <Textarea label="When approval decision is typically made" value={approvalTiming} onChange={setApprovalTiming} placeholder="Usually after the discovery day..." rows={2} />
        <Textarea label="Who has final sign-off" value={approvalAuthority} onChange={setApprovalAuthority} placeholder="Franchise Director, MD, approval committee..." rows={2} />
        <Textarea label="Timeline: enquiry to signed contract" value={timelineContract} onChange={setTimelineContract} placeholder="e.g. 6–12 weeks for motivated applicants..." rows={2} />
        <Textarea label="Post-signing onboarding activities" value={postSigning} onChange={setPostSigning} placeholder="Training, site selection, fit-out, pre-launch marketing..." />
        <Textarea label="Timeline: signing to opening day" value={timelineLaunch} onChange={setTimelineLaunch} placeholder="e.g. 4–6 months..." rows={2} />
        <Textarea label="Biggest recruitment bottlenecks" value={bottlenecks} onChange={setBottlenecks} placeholder="Too many unqualified leads, slow decision stages..." />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Self-rating: recruitment process (1–10)</label>
          <GradientRating value={rating} onChange={setRating} />
        </div>
      </SectionCard>
    </div>
  )
}
