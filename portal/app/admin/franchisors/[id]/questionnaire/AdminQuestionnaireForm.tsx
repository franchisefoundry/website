'use client'

import { useState } from 'react'
import type { SectionRow, QuestionRow } from '@/app/admin/questionnaire-template/page'
import { DualRangeSlider, INVESTMENT_STEPS } from '@/components/questionnaire/DualRangeSlider'
import { SingleSlider } from '@/components/questionnaire/SingleSlider'
import { SpectrumSlider } from '@/components/questionnaire/SpectrumSlider'
import { GradientRating } from '@/components/questionnaire/GradientRating'
import { StepBuilder } from '@/components/questionnaire/StepBuilder'
import { OperatingModelCards } from '@/components/questionnaire/OperatingModelCards'

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

// Fallback options in case the template DB row is missing options
const FALLBACK_APPROVAL_FACTORS = [
  'Financial strength / liquidity','Relevant business or management experience','Alignment with brand values',
  'Commitment and motivation','Location / territory fit','Previous franchising experience',
  'Entrepreneurial mindset','Communication and coachability',
]
const FALLBACK_DECLINE_REASONS = [
  'Insufficient capital','Wrong mindset / attitude','Unrealistic expectations','Poor location or territory',
  'Lack of relevant experience','Failed background / credit check','Values mismatch','Overqualified / poor fit',
]
const FALLBACK_INQUIRY_CHANNELS = [
  'Franchise portals (e.g. Franchise Direct)','Referrals from existing franchisees','Social media / paid ads',
  'PR and press coverage','Word of mouth','Franchise Foundry','Events / expos','Website / organic search',
]

interface Props {
  franchisorId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existing: Record<string, any> | null
  sections: SectionRow[]
}

// Textarea that keeps keystrokes local — notifies parent only on blur so
// a single keystroke never re-renders the entire 500-line admin form.
function LazyTextarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  const [local, setLocal] = useState(value)
  return (
    <textarea
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => onChange(e.target.value)}
      rows={rows}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
    />
  )
}

function nearestStep(val: number) {
  const exact = INVESTMENT_STEPS.indexOf(val)
  if (exact >= 0) return val
  return INVESTMENT_STEPS.reduce((best, s) =>
    Math.abs(s - val) < Math.abs(best - val) ? s : best, INVESTMENT_STEPS[0])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminQuestionnaireForm({ franchisorId, existing, sections }: Props) {
  const e = existing ?? {}

  // Build lookup maps from the template
  const allQuestions = sections.flatMap(s => s.questions)
  const questionTexts: Record<string, string> = Object.fromEntries(allQuestions.map(q => [q.field_key, q.question_text]))
  const questionOptions: Record<string, string[]> = Object.fromEntries(
    allQuestions.filter(q => q.options?.length).map(q => [q.field_key, q.options!])
  )
  const customQuestions = allQuestions.filter(q => q.field_key.startsWith('custom_'))

  // Section 1
  const [coreModel, setCoreModel] = useState<string>(e.core_model ?? '')
  const [compAdvantage, setCompAdvantage] = useState<string>(e.competitive_advantage ?? '')
  const [revenueStreams, setRevenueStreams] = useState<string>(e.revenue_streams ?? '')
  const [highPerforming, setHighPerforming] = useState<string>(e.high_performing_unit ?? '')
  const [underperformance, setUnderperformance] = useState<string>(e.underperformance_reasons ?? '')

  // Section 2 — investment slider
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
  const [approvalFactors, setApprovalFactors] = useState<string[]>(e.approval_factors ?? [])
  const [singleLicence, setSingleLicence] = useState<boolean | null>(e.single_franchise_licenses ?? null)
  const [operatingModel, setOperatingModel] = useState<string>(e.operating_model_raw ?? '')
  const [declineReasons, setDeclineReasons] = useState<string[]>(e.decline_reasons ?? [])
  const [problematicBehaviours, setProblematicBehaviours] = useState<string>(e.problematic_behaviours ?? '')
  const [successDef, setSuccessDef] = useState<string>(e.success_definition ?? '')

  // Section 4 — growth sliders + new matching fields
  const [formatTypes, setFormatTypes] = useState<string[]>(e.format_types ?? [])
  const [locationsAvailable, setLocationsAvailable] = useState<string[]>(e.locations_available ?? [])
  const [growthTargetUnits, setGrowthTargetUnits] = useState<number>(e.growth_target_units ?? 5)
  const [growthContext, setGrowthContext] = useState<string>(e.annual_growth_targets ?? '')
  const [territories, setTerritories] = useState<string>(e.priority_territories ?? '')
  const [growthQualityScore, setGrowthQualityScore] = useState<number>(e.growth_quality_score ?? 50)
  const [scalingConcerns, setScalingConcerns] = useState<string>(e.scaling_concerns ?? '')
  const [timelineMonths, setTimelineMonths] = useState<number>(e.timeline_months ?? 6)

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

  // Custom question answers (stored in custom_answers JSONB)
  const [customAnswers, setCustomAnswers] = useState<Record<string, unknown>>(e.custom_answers ?? {})
  function setCustomAnswer(key: string, value: unknown) {
    setCustomAnswers(prev => ({ ...prev, [key]: value }))
  }

  const [savingSection, setSavingSection] = useState<number | null>(null)
  const [savedSection, setSavedSection] = useState<number | null>(null)
  const [errorSection, setErrorSection] = useState<number | null>(null)

  async function saveSection(section: number, payload: Record<string, unknown>) {
    setSavingSection(section)
    setSavedSection(null)
    setErrorSection(null)
    try {
      const res = await fetch(`/api/admin/franchisors/${franchisorId}/questionnaire`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: payload }),
      })
      if (!res.ok) {
        setErrorSection(section)
      } else {
        setSavedSection(section)
        setTimeout(() => setSavedSection(null), 3000)
      }
    } catch {
      setErrorSection(section)
    } finally {
      setSavingSection(null)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function q(fieldKey: string, fallback: string) {
    return questionTexts[fieldKey] ?? fallback
  }

  function opts(fieldKey: string, fallback: string[]) {
    return questionOptions[fieldKey] ?? fallback
  }

  function ta(label: string, value: string, onChange: (v: string) => void, rows = 3) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        {/* LazyTextarea keeps keystrokes local — notifies parent only on blur */}
        <LazyTextarea value={value} onChange={onChange} rows={rows} />
      </div>
    )
  }

  function sliderWrap(label: string, hint: string, children: React.ReactNode) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <p className="text-xs text-slate-400 mb-2">{hint}</p>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          {children}
        </div>
      </div>
    )
  }

  function multiChips(label: string, options: string[], selected: string[], onChange: (v: string[]) => void) {
    function toggle(opt: string) {
      onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt])
    }
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">{label}</label>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <button key={opt} type="button" onClick={() => toggle(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                selected.includes(opt) ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderCustomQuestion(cq: QuestionRow) {
    const val = customAnswers[cq.field_key]
    const strVal = typeof val === 'string' ? val : ''
    const arrVal = Array.isArray(val) ? val : []
    const numVal = typeof val === 'number' ? val : 0

    if (cq.input_type === 'textarea') {
      return ta(cq.question_text, strVal, v => setCustomAnswer(cq.field_key, v), cq.textarea_rows)
    }
    if (cq.input_type === 'yes_no') {
      return (
        <div key={cq.field_key}>
          <label className="block text-xs font-medium text-slate-600 mb-2">{cq.question_text}</label>
          <div className="flex gap-2">
            {([true, false] as const).map(v => (
              <button key={String(v)} type="button" onClick={() => setCustomAnswer(cq.field_key, v)}
                className={`px-4 py-1.5 rounded-lg text-xs border transition-colors ${
                  val === v ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}>
                {v ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
      )
    }
    if (cq.input_type === 'multiselect') {
      return multiChips(cq.question_text, cq.options ?? [], arrVal as string[], v => setCustomAnswer(cq.field_key, v))
    }
    if (cq.input_type === 'rating') {
      return (
        <div key={cq.field_key}>
          <label className="block text-xs font-medium text-slate-600 mb-2">{cq.question_text} (1–10)</label>
          <GradientRating value={numVal} onChange={v => setCustomAnswer(cq.field_key, v)} />
        </div>
      )
    }
    return null
  }

  function SaveBar({ section, onSave }: { section: number; onSave: () => void }) {
    return (
      <div className="flex items-center gap-3 pt-3 border-t border-slate-100 mt-2">
        <button type="button" onClick={onSave} disabled={savingSection === section}
          className="bg-brand-green hover:bg-brand-green-dark text-white font-medium py-1.5 px-4 rounded-lg text-xs transition-colors disabled:opacity-60">
          {savingSection === section ? 'Saving…' : 'Save changes'}
        </button>
        {savedSection === section && <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>}
        {errorSection === section && <span className="text-xs text-red-500">Save failed — try again</span>}
      </div>
    )
  }

  function SectionCard({ title, children, section, onSave }: {
    title: string; children: React.ReactNode; section: number; onSave: () => void
  }) {
    const [open, setOpen] = useState(true)
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors">
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
            {children}
            <SaveBar section={section} onSave={onSave} />
          </div>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* 1 · The Business */}
      <SectionCard title="1 · The Business" section={1} onSave={() => saveSection(1, {
        core_model: coreModel, competitive_advantage: compAdvantage,
        revenue_streams: revenueStreams, high_performing_unit: highPerforming,
        underperformance_reasons: underperformance,
      })}>
        {ta(q('core_model', 'Core business model & day-to-day operations'), coreModel, setCoreModel, 4)}
        {ta(q('competitive_advantage', 'Competitive advantage'), compAdvantage, setCompAdvantage)}
        {ta(q('revenue_streams', 'Revenue streams'), revenueStreams, setRevenueStreams, 2)}
        {ta(q('high_performing_unit', 'High-performing unit (metrics)'), highPerforming, setHighPerforming)}
        {ta(q('underperformance_reasons', 'Common reasons for underperformance'), underperformance, setUnderperformance)}
      </SectionCard>

      {/* 2 · Financials */}
      <SectionCard title="2 · Financials" section={2} onSave={() => saveSection(2, {
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
      })}>
        {sliderWrap(
          q('investment_range_raw', 'Total investment range'),
          'Drag the handles to set the minimum and maximum investment',
          <DualRangeSlider
            min={investmentMin}
            max={investmentMax}
            onChange={(mn, mx) => { setInvestmentMin(mn); setInvestmentMax(mx) }}
            variant="light"
          />
        )}
        {ta('Investment breakdown notes', investmentNotes, setInvestmentNotes, 2)}
        {sliderWrap(
          q('liquid_capital_min', 'Minimum liquid capital required'),
          'Cash the franchisee must have on day one — separate from financed investment',
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
        )}
        {ta(q('commercial_rates', 'Commercial terms (fee, royalty, levy)'), commercialRates, setCommercialRates, 2)}
        {ta(q('financial_metrics_shared', 'Financial data shared with prospects'), financialMetrics, setFinancialMetrics)}
        {sliderWrap(
          q('break_even_timeline', 'Typical break-even timeline'),
          'Drag to set average months to break even',
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
        )}
        {ta('Break-even context / caveats', breakEvenNotes, setBreakEvenNotes, 2)}
        {ta(q('underestimated_costs', 'Most underestimated costs'), underestimatedCosts, setUnderestimatedCosts)}
        {ta(q('common_objections', 'Common financial objections'), commonObjections, setCommonObjections)}
      </SectionCard>

      {/* 3 · Ideal Franchisee */}
      <SectionCard title="3 · Ideal Franchisee" section={3} onSave={() => saveSection(3, {
        ideal_franchisee_profile: idealFranchisee,
        background_experience: backgroundExp,
        experience_required: experienceRequired || null,
        full_time_required: fullTimeRequired,
        approval_factors: approvalFactors,
        single_franchise_licenses: singleLicence,
        operating_model_raw: operatingModel || null,
        decline_reasons: declineReasons,
        problematic_behaviours: problematicBehaviours,
        success_definition: successDef,
      })}>
        {ta(q('ideal_franchisee_profile', 'Ideal franchisee profile'), idealFranchisee, setIdealFranchisee)}
        {ta(q('background_experience', 'Required / preferred experience'), backgroundExp, setBackgroundExp, 2)}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">{q('experience_required', 'Minimum experience level required')}</label>
          <div className="space-y-1.5">
            {EXPERIENCE_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setExperienceRequired(opt.value)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                  experienceRequired === opt.value ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">{q('full_time_required', 'Is full-time commitment required?')}</label>
          <div className="flex gap-2">
            {([true, false] as const).map(val => (
              <button key={String(val)} type="button" onClick={() => setFullTimeRequired(val)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs border transition-colors ${fullTimeRequired === val ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
        {multiChips(q('approval_factors', 'Top approval factors'), opts('approval_factors', FALLBACK_APPROVAL_FACTORS), approvalFactors, setApprovalFactors)}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">{q('single_franchise_licenses', 'Single-location licences granted?')}</label>
          <div className="flex gap-2">
            {([true, false] as const).map(val => (
              <button key={String(val)} type="button" onClick={() => setSingleLicence(val)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs border transition-colors ${singleLicence === val ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">{q('operating_model_raw', 'Operating model')}</label>
          <OperatingModelCards value={operatingModel} onChange={setOperatingModel} variant="light" />
        </div>
        {multiChips(q('decline_reasons', 'Common decline reasons'), opts('decline_reasons', FALLBACK_DECLINE_REASONS), declineReasons, setDeclineReasons)}
        {ta(q('problematic_behaviours', "Franchisee types that haven't worked"), problematicBehaviours, setProblematicBehaviours)}
        {ta(q('success_definition', 'Definition of franchisee success'), successDef, setSuccessDef)}
      </SectionCard>

      {/* 4 · Growth & Territory */}
      <SectionCard title="4 · Growth & Territory" section={4} onSave={() => saveSection(4, {
        format_types: formatTypes.length ? formatTypes : null,
        locations_available: locationsAvailable.length ? locationsAvailable : null,
        growth_target_units: growthTargetUnits,
        annual_growth_targets: growthContext || null,
        priority_territories: territories,
        growth_quality_score: growthQualityScore,
        growth_speed_vs_quality: null,
        scaling_concerns: scalingConcerns,
        timeline_months: timelineMonths,
      })}>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">{q('format_types', 'Franchise formats')}</label>
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map(fmt => (
              <button key={fmt} type="button"
                onClick={() => setFormatTypes(formatTypes.includes(fmt) ? formatTypes.filter(f => f !== fmt) : [...formatTypes, fmt])}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${formatTypes.includes(fmt) ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                {FORMAT_LABELS[fmt]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">{q('locations_available', 'Active UK territories')}</label>
          <p className="text-xs text-slate-400 mb-2">Cities actively seeking franchisees — hard filter in matching</p>
          <div className="flex flex-wrap gap-2">
            {UK_CITY_OPTIONS.map(city => (
              <button key={city} type="button"
                onClick={() => setLocationsAvailable(locationsAvailable.includes(city) ? locationsAvailable.filter(c => c !== city) : [...locationsAvailable, city])}
                className={`px-3 py-1 rounded-full text-xs border capitalize transition-colors ${locationsAvailable.includes(city) ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                {city.charAt(0).toUpperCase() + city.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {sliderWrap(
          q('annual_growth_targets', 'Annual unit target'),
          'How many new franchise units per year?',
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
        )}
        {ta('Growth context & timeframe', growthContext, setGrowthContext, 2)}
        {ta(q('priority_territories', 'Priority UK territories (detail)'), territories, setTerritories, 2)}
        {sliderWrap(
          q('growth_speed_vs_quality', 'Growth philosophy — speed vs. quality'),
          'Where does their approach sit on the spectrum?',
          <SpectrumSlider
            value={growthQualityScore}
            onChange={setGrowthQualityScore}
            variant="light"
          />
        )}
        {ta(q('scaling_concerns', 'Biggest scaling concern'), scalingConcerns, setScalingConcerns)}
        {sliderWrap(
          q('timeline_months', 'Months from inquiry to opening'),
          'Include training, fit-out and launch preparation',
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
        )}
      </SectionCard>

      {/* 5 · Recruitment Process */}
      <SectionCard title="5 · Recruitment Process" section={5} onSave={() => saveSection(5, {
        inquiry_channels: inquiryChannels,
        screening_steps: screeningSteps,
        screening_method: screeningSteps.join('\n'),
        approval_timing: approvalTiming, approval_authority: approvalAuthority,
        timeline_inquiry_to_contract: timelineContract, post_signing_activities: postSigning,
        timeline_signing_to_launch: timelineLaunch, process_bottlenecks: bottlenecks,
        recruitment_process_rating: rating || null,
      })}>
        {multiChips(q('inquiry_channels', 'Where enquiries come from'), opts('inquiry_channels', FALLBACK_INQUIRY_CHANNELS), inquiryChannels, setInquiryChannels)}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{q('screening_method', 'Screening process steps')}</label>
          <p className="text-xs text-slate-400 mb-2">Hover a step to reorder or remove it</p>
          <StepBuilder steps={screeningSteps} onChange={setScreeningSteps} placeholder="Describe this step…" variant="light" />
        </div>
        {ta(q('approval_timing', 'When approval decision is made'), approvalTiming, setApprovalTiming, 2)}
        {ta(q('approval_authority', 'Final sign-off authority'), approvalAuthority, setApprovalAuthority, 2)}
        {ta(q('timeline_inquiry_to_contract', 'Timeline: enquiry to contract'), timelineContract, setTimelineContract, 2)}
        {ta(q('post_signing_activities', 'Post-signing onboarding activities'), postSigning, setPostSigning)}
        {ta(q('timeline_signing_to_launch', 'Timeline: signing to opening'), timelineLaunch, setTimelineLaunch, 2)}
        {ta(q('process_bottlenecks', 'Biggest recruitment bottlenecks'), bottlenecks, setBottlenecks)}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">{q('recruitment_process_rating', 'Recruitment process self-rating (1–10)')}</label>
          <GradientRating value={rating} onChange={setRating} />
        </div>
      </SectionCard>

      {/* Custom questions added via the template editor */}
      {customQuestions.length > 0 && (
        <SectionCard title="Additional Questions" section={6} onSave={() => saveSection(6, { custom_answers: customAnswers })}>
          {customQuestions.map(cq => (
            <div key={cq.field_key}>
              {renderCustomQuestion(cq)}
            </div>
          ))}
        </SectionCard>
      )}

    </div>
  )
}
