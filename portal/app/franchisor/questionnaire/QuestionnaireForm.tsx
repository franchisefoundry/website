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

function Textarea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
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
  const [commercialRates, setCommercialRates] = useState<string>(e.commercial_rates ?? '')
  const [financialMetrics, setFinancialMetrics] = useState<string>(e.financial_metrics_shared ?? '')
  const [breakEvenMonths, setBreakEvenMonths] = useState<number>(e.break_even_months ?? 18)
  const [breakEvenNotes, setBreakEvenNotes] = useState<string>(e.break_even_timeline ?? '')
  const [underestimatedCosts, setUnderestimatedCosts] = useState<string>(e.underestimated_costs ?? '')
  const [commonObjections, setCommonObjections] = useState<string>(e.common_objections ?? '')

  // Section 3
  const [idealFranchisee, setIdealFranchisee] = useState<string>(e.ideal_franchisee_profile ?? '')
  const [backgroundExp, setBackgroundExp] = useState<string>(e.background_experience ?? '')
  const [approvalFactors, setApprovalFactors] = useState<string[]>(e.approval_factors ?? [])
  const [declineReasons, setDeclineReasons] = useState<string[]>(e.decline_reasons ?? [])
  const [problematicBehaviours, setProblematicBehaviours] = useState<string>(e.problematic_behaviours ?? '')
  const [successDef, setSuccessDef] = useState<string>(e.success_definition ?? '')

  // Section 4 — growth slider + territory + spectrum
  const [growthTargetUnits, setGrowthTargetUnits] = useState<number>(e.growth_target_units ?? 5)
  const [growthContext, setGrowthContext] = useState<string>(e.annual_growth_targets ?? '')
  const [territories, setTerritories] = useState<string>(e.priority_territories ?? '')
  const [growthQualityScore, setGrowthQualityScore] = useState<number>(e.growth_quality_score ?? 50)
  const [scalingConcerns, setScalingConcerns] = useState<string>(e.scaling_concerns ?? '')

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
          approval_factors: approvalFactors,
          decline_reasons: declineReasons,
          problematic_behaviours: problematicBehaviours,
          success_definition: successDef,
        })}
        saving={savingSection === 3}
        saved={savedSection === 3}
      >
        <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Operator model and multi-site preferences are managed in your <a href="/franchisor/brand-profile" className="underline">Brand Profile</a>.
        </p>
        <Textarea label="Ideal franchisee profile" value={idealFranchisee} onChange={setIdealFranchisee} placeholder="Age range, background, personality, motivations..." />
        <Textarea label="Required or preferred experience" value={backgroundExp} onChange={setBackgroundExp} placeholder="Management, F&B, business ownership..." rows={2} />
        <MultiSelect label="Top approval factors" options={APPROVAL_FACTOR_OPTIONS} selected={approvalFactors} onChange={setApprovalFactors} />
        <MultiSelect label="Common decline reasons" options={DECLINE_REASON_OPTIONS} selected={declineReasons} onChange={setDeclineReasons} />
        <Textarea label="Types of franchisee that haven't worked well" value={problematicBehaviours} onChange={setProblematicBehaviours} placeholder="Behaviours, mindsets, backgrounds to avoid..." />
        <Textarea label="How you define franchisee success" value={successDef} onChange={setSuccessDef} placeholder="Beyond revenue — culture, brand, growth..." />
      </SectionCard>

      {/* 4 · Growth & Territory */}
      <SectionCard
        title="4 · Growth & Territory"
        onSave={() => saveSection(4, {
          growth_target_units: growthTargetUnits,
          annual_growth_targets: growthContext || null,
          priority_territories: territories,
          growth_quality_score: growthQualityScore,
          growth_speed_vs_quality: null, // replaced by slider
          scaling_concerns: scalingConcerns,
        })}
        saving={savingSection === 4}
        saved={savedSection === 4}
      >
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
        <Textarea label="Priority UK territories" value={territories} onChange={setTerritories} placeholder="Manchester, West Yorkshire, Glasgow..." rows={2} />
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
