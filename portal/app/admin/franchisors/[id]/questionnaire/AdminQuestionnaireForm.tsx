'use client'

import { useState } from 'react'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminQuestionnaireForm({ franchisorId, existing }: { franchisorId: string; existing: Record<string, any> | null }) {
  const e = existing ?? {}

  // Section 1
  const [coreModel, setCoreModel] = useState<string>(e.core_model ?? '')
  const [compAdvantage, setCompAdvantage] = useState<string>(e.competitive_advantage ?? '')
  const [revenueStreams, setRevenueStreams] = useState<string>(e.revenue_streams ?? '')
  const [highPerforming, setHighPerforming] = useState<string>(e.high_performing_unit ?? '')
  const [underperformance, setUnderperformance] = useState<string>(e.underperformance_reasons ?? '')

  // Section 2
  const [investmentRaw, setInvestmentRaw] = useState<string>(e.investment_range_raw ?? '')
  const [commercialRates, setCommercialRates] = useState<string>(e.commercial_rates ?? '')
  const [financialMetrics, setFinancialMetrics] = useState<string>(e.financial_metrics_shared ?? '')
  const [breakEven, setBreakEven] = useState<string>(e.break_even_timeline ?? '')
  const [underestimatedCosts, setUnderestimatedCosts] = useState<string>(e.underestimated_costs ?? '')
  const [commonObjections, setCommonObjections] = useState<string>(e.common_objections ?? '')

  // Section 3
  const [idealFranchisee, setIdealFranchisee] = useState<string>(e.ideal_franchisee_profile ?? '')
  const [backgroundExp, setBackgroundExp] = useState<string>(e.background_experience ?? '')
  const [approvalFactors, setApprovalFactors] = useState<string[]>(e.approval_factors ?? [])
  const [singleLicence, setSingleLicence] = useState<boolean | null>(e.single_franchise_licenses ?? null)
  const [operatingModel, setOperatingModel] = useState<string>(e.operating_model_raw ?? '')
  const [declineReasons, setDeclineReasons] = useState<string[]>(e.decline_reasons ?? [])
  const [problematicBehaviours, setProblematicBehaviours] = useState<string>(e.problematic_behaviours ?? '')
  const [successDef, setSuccessDef] = useState<string>(e.success_definition ?? '')

  // Section 4
  const [growthTargets, setGrowthTargets] = useState<string>(e.annual_growth_targets ?? '')
  const [territories, setTerritories] = useState<string>(e.priority_territories ?? '')
  const [growthSpeed, setGrowthSpeed] = useState<string>(e.growth_speed_vs_quality ?? '')
  const [scalingConcerns, setScalingConcerns] = useState<string>(e.scaling_concerns ?? '')

  // Section 5
  const [inquiryChannels, setInquiryChannels] = useState<string[]>(e.inquiry_channels ?? [])
  const [screeningMethod, setScreeningMethod] = useState<string>(e.screening_method ?? '')
  const [approvalTiming, setApprovalTiming] = useState<string>(e.approval_timing ?? '')
  const [approvalAuthority, setApprovalAuthority] = useState<string>(e.approval_authority ?? '')
  const [timelineContract, setTimelineContract] = useState<string>(e.timeline_inquiry_to_contract ?? '')
  const [postSigning, setPostSigning] = useState<string>(e.post_signing_activities ?? '')
  const [timelineLaunch, setTimelineLaunch] = useState<string>(e.timeline_signing_to_launch ?? '')
  const [bottlenecks, setBottlenecks] = useState<string>(e.process_bottlenecks ?? '')
  const [rating, setRating] = useState<number>(e.recruitment_process_rating ?? 0)

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
        const { error } = await res.json()
        console.error('Save error:', error)
        setErrorSection(section)
      } else {
        setSavedSection(section)
        setTimeout(() => setSavedSection(null), 3000)
      }
    } catch (err) {
      console.error('Save error:', err)
      setErrorSection(section)
    } finally {
      setSavingSection(null)
    }
  }

  function ta(label: string, value: string, onChange: (v: string) => void, rows = 3, placeholder?: string) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
        />
      </div>
    )
  }

  function multiSelect(label: string, options: string[], selected: string[], onChange: (v: string[]) => void) {
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

  function SaveBar({ section, onSave }: { section: number; onSave: () => void }) {
    return (
      <div className="flex items-center gap-3 pt-3 border-t border-slate-100 mt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={savingSection === section}
          className="bg-brand-green hover:bg-brand-green-dark text-white font-medium py-1.5 px-4 rounded-lg text-xs transition-colors disabled:opacity-60"
        >
          {savingSection === section ? 'Saving…' : 'Save changes'}
        </button>
        {savedSection === section && <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>}
        {errorSection === section && <span className="text-xs text-red-500">Save failed — try again</span>}
      </div>
    )
  }

  function SectionCard({ title, children, section, onSave }: {
    title: string
    children: React.ReactNode
    section: number
    onSave: () => void
  }) {
    const [open, setOpen] = useState(false)
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
        >
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

  return (
    <div className="space-y-3">
      <SectionCard title="1 · The Business" section={1} onSave={() => saveSection(1, {
        core_model: coreModel, competitive_advantage: compAdvantage,
        revenue_streams: revenueStreams, high_performing_unit: highPerforming,
        underperformance_reasons: underperformance,
      })}>
        {ta('Core business model & day-to-day operations', coreModel, setCoreModel, 4)}
        {ta('Competitive advantage', compAdvantage, setCompAdvantage)}
        {ta('Revenue streams', revenueStreams, setRevenueStreams, 2)}
        {ta('High-performing unit (metrics)', highPerforming, setHighPerforming)}
        {ta('Common reasons for underperformance', underperformance, setUnderperformance)}
      </SectionCard>

      <SectionCard title="2 · Financials" section={2} onSave={() => saveSection(2, {
        investment_range_raw: investmentRaw, commercial_rates: commercialRates,
        financial_metrics_shared: financialMetrics, break_even_timeline: breakEven,
        underestimated_costs: underestimatedCosts, common_objections: commonObjections,
      })}>
        {ta('Total investment range & breakdown', investmentRaw, setInvestmentRaw)}
        {ta('Commercial terms (fee, royalty, levy)', commercialRates, setCommercialRates, 2)}
        {ta('Financial data shared with prospects', financialMetrics, setFinancialMetrics)}
        {ta('Break-even timeline', breakEven, setBreakEven, 2)}
        {ta('Most underestimated costs', underestimatedCosts, setUnderestimatedCosts)}
        {ta('Common financial objections', commonObjections, setCommonObjections)}
      </SectionCard>

      <SectionCard title="3 · Ideal Franchisee" section={3} onSave={() => saveSection(3, {
        ideal_franchisee_profile: idealFranchisee, background_experience: backgroundExp,
        approval_factors: approvalFactors, single_franchise_licenses: singleLicence,
        operating_model_raw: operatingModel, decline_reasons: declineReasons,
        problematic_behaviours: problematicBehaviours, success_definition: successDef,
      })}>
        {ta('Ideal franchisee profile', idealFranchisee, setIdealFranchisee)}
        {ta('Required / preferred experience', backgroundExp, setBackgroundExp, 2)}
        {multiSelect('Top approval factors', APPROVAL_FACTOR_OPTIONS, approvalFactors, setApprovalFactors)}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Single-location licences granted</label>
          <div className="flex gap-2">
            {([true, false] as const).map(val => (
              <button key={String(val)} type="button" onClick={() => setSingleLicence(val)}
                className={`px-4 py-1.5 rounded-lg text-xs border transition-colors ${
                  singleLicence === val ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}>
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Operating model</label>
          <div className="flex flex-col gap-1.5">
            {[
              { val: 'owner-operator', label: 'Must be owner-operator' },
              { val: 'hire-manager',   label: 'Can hire a manager' },
              { val: 'either',         label: 'Either is acceptable' },
            ].map(opt => (
              <button key={opt.val} type="button" onClick={() => setOperatingModel(opt.val)}
                className={`px-3 py-2 rounded-lg text-xs border text-left transition-colors ${
                  operatingModel === opt.val ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {multiSelect('Common decline reasons', DECLINE_REASON_OPTIONS, declineReasons, setDeclineReasons)}
        {ta('Franchisee types that haven\'t worked', problematicBehaviours, setProblematicBehaviours)}
        {ta('Definition of franchisee success', successDef, setSuccessDef)}
      </SectionCard>

      <SectionCard title="4 · Growth & Territory" section={4} onSave={() => saveSection(4, {
        annual_growth_targets: growthTargets, priority_territories: territories,
        growth_speed_vs_quality: growthSpeed, scaling_concerns: scalingConcerns,
      })}>
        {ta('Annual growth targets', growthTargets, setGrowthTargets, 2)}
        {ta('Priority UK territories', territories, setTerritories, 2)}
        {ta('Balancing growth speed vs. quality', growthSpeed, setGrowthSpeed)}
        {ta('Biggest scaling concern', scalingConcerns, setScalingConcerns)}
      </SectionCard>

      <SectionCard title="5 · Recruitment Process" section={5} onSave={() => saveSection(5, {
        inquiry_channels: inquiryChannels, screening_method: screeningMethod,
        approval_timing: approvalTiming, approval_authority: approvalAuthority,
        timeline_inquiry_to_contract: timelineContract, post_signing_activities: postSigning,
        timeline_signing_to_launch: timelineLaunch, process_bottlenecks: bottlenecks,
        recruitment_process_rating: rating || null,
      })}>
        {multiSelect('Where enquiries come from', INQUIRY_CHANNEL_OPTIONS, inquiryChannels, setInquiryChannels)}
        {ta('Screening process (step by step)', screeningMethod, setScreeningMethod, 4)}
        {ta('When approval decision is made', approvalTiming, setApprovalTiming, 2)}
        {ta('Final sign-off authority', approvalAuthority, setApprovalAuthority, 2)}
        {ta('Timeline: enquiry to contract', timelineContract, setTimelineContract, 2)}
        {ta('Post-signing onboarding activities', postSigning, setPostSigning)}
        {ta('Timeline: signing to opening', timelineLaunch, setTimelineLaunch, 2)}
        {ta('Biggest recruitment bottlenecks', bottlenecks, setBottlenecks)}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Recruitment process self-rating (1–10)</label>
          <div className="flex gap-1.5">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                  rating === n ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
