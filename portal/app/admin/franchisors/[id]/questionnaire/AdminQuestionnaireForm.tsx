'use client'

import { useState } from 'react'
import type { SectionRow, QuestionRow } from '@/app/admin/questionnaire-template/page'

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

  // Standard answers (specific columns)
  const [coreModel, setCoreModel] = useState<string>(e.core_model ?? '')
  const [compAdvantage, setCompAdvantage] = useState<string>(e.competitive_advantage ?? '')
  const [revenueStreams, setRevenueStreams] = useState<string>(e.revenue_streams ?? '')
  const [highPerforming, setHighPerforming] = useState<string>(e.high_performing_unit ?? '')
  const [underperformance, setUnderperformance] = useState<string>(e.underperformance_reasons ?? '')
  const [investmentRaw, setInvestmentRaw] = useState<string>(e.investment_range_raw ?? '')
  const [commercialRates, setCommercialRates] = useState<string>(e.commercial_rates ?? '')
  const [financialMetrics, setFinancialMetrics] = useState<string>(e.financial_metrics_shared ?? '')
  const [breakEven, setBreakEven] = useState<string>(e.break_even_timeline ?? '')
  const [underestimatedCosts, setUnderestimatedCosts] = useState<string>(e.underestimated_costs ?? '')
  const [commonObjections, setCommonObjections] = useState<string>(e.common_objections ?? '')
  const [idealFranchisee, setIdealFranchisee] = useState<string>(e.ideal_franchisee_profile ?? '')
  const [backgroundExp, setBackgroundExp] = useState<string>(e.background_experience ?? '')
  const [approvalFactors, setApprovalFactors] = useState<string[]>(e.approval_factors ?? [])
  const [singleLicence, setSingleLicence] = useState<boolean | null>(e.single_franchise_licenses ?? null)
  const [operatingModel, setOperatingModel] = useState<string>(e.operating_model_raw ?? '')
  const [declineReasons, setDeclineReasons] = useState<string[]>(e.decline_reasons ?? [])
  const [problematicBehaviours, setProblematicBehaviours] = useState<string>(e.problematic_behaviours ?? '')
  const [successDef, setSuccessDef] = useState<string>(e.success_definition ?? '')
  const [growthTargets, setGrowthTargets] = useState<string>(e.annual_growth_targets ?? '')
  const [territories, setTerritories] = useState<string>(e.priority_territories ?? '')
  const [growthSpeed, setGrowthSpeed] = useState<string>(e.growth_speed_vs_quality ?? '')
  const [scalingConcerns, setScalingConcerns] = useState<string>(e.scaling_concerns ?? '')
  const [inquiryChannels, setInquiryChannels] = useState<string[]>(e.inquiry_channels ?? [])
  const [screeningMethod, setScreeningMethod] = useState<string>(e.screening_method ?? '')
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
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none" />
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
          <div className="flex gap-1.5">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} type="button" onClick={() => setCustomAnswer(cq.field_key, n)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                  numVal === n ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}>
                {n}
              </button>
            ))}
          </div>
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

      <SectionCard title="2 · Financials" section={2} onSave={() => saveSection(2, {
        investment_range_raw: investmentRaw, commercial_rates: commercialRates,
        financial_metrics_shared: financialMetrics, break_even_timeline: breakEven,
        underestimated_costs: underestimatedCosts, common_objections: commonObjections,
      })}>
        {ta(q('investment_range_raw', 'Total investment range & breakdown'), investmentRaw, setInvestmentRaw)}
        {ta(q('commercial_rates', 'Commercial terms (fee, royalty, levy)'), commercialRates, setCommercialRates, 2)}
        {ta(q('financial_metrics_shared', 'Financial data shared with prospects'), financialMetrics, setFinancialMetrics)}
        {ta(q('break_even_timeline', 'Break-even timeline'), breakEven, setBreakEven, 2)}
        {ta(q('underestimated_costs', 'Most underestimated costs'), underestimatedCosts, setUnderestimatedCosts)}
        {ta(q('common_objections', 'Common financial objections'), commonObjections, setCommonObjections)}
      </SectionCard>

      <SectionCard title="3 · Ideal Franchisee" section={3} onSave={() => saveSection(3, {
        ideal_franchisee_profile: idealFranchisee, background_experience: backgroundExp,
        approval_factors: approvalFactors, single_franchise_licenses: singleLicence,
        operating_model_raw: operatingModel, decline_reasons: declineReasons,
        problematic_behaviours: problematicBehaviours, success_definition: successDef,
      })}>
        {ta(q('ideal_franchisee_profile', 'Ideal franchisee profile'), idealFranchisee, setIdealFranchisee)}
        {ta(q('background_experience', 'Required / preferred experience'), backgroundExp, setBackgroundExp, 2)}
        {multiChips(q('approval_factors', 'Top approval factors'), opts('approval_factors', FALLBACK_APPROVAL_FACTORS), approvalFactors, setApprovalFactors)}
        {/* Profile-linked fields — locked */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-3">
          <p className="text-xs text-amber-700 font-medium">
            🔒 These fields are linked to the brand profile — edit them via{' '}
            <a href="../edit" className="underline hover:text-amber-900">Brand Profile → Edit</a>
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">{q('single_franchise_licenses', 'Single-location licences granted')}</label>
            <div className="flex gap-2">
              {([true, false] as const).map(val => (
                <div key={String(val)} className={`px-4 py-1.5 rounded-lg text-xs border cursor-not-allowed select-none ${singleLicence === val ? 'bg-slate-200 border-slate-300 text-slate-600 font-semibold' : 'border-slate-200 text-slate-400'}`}>
                  {val ? 'Yes' : 'No'}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">{q('operating_model_raw', 'Operating model')}</label>
            <div className="flex flex-col gap-1.5">
              {(opts('operating_model_raw', ['owner-operator','hire-manager','either'])).map(opt => (
                <div key={opt} className={`px-3 py-2 rounded-lg text-xs border cursor-not-allowed select-none ${operatingModel === opt ? 'bg-slate-200 border-slate-300 text-slate-600 font-semibold' : 'border-slate-200 text-slate-400'}`}>
                  {opt === 'owner-operator' ? 'Must be owner-operator' : opt === 'hire-manager' ? 'Can hire a manager' : 'Either is acceptable'}
                </div>
              ))}
            </div>
          </div>
        </div>
        {multiChips(q('decline_reasons', 'Common decline reasons'), opts('decline_reasons', FALLBACK_DECLINE_REASONS), declineReasons, setDeclineReasons)}
        {ta(q('problematic_behaviours', "Franchisee types that haven't worked"), problematicBehaviours, setProblematicBehaviours)}
        {ta(q('success_definition', 'Definition of franchisee success'), successDef, setSuccessDef)}
      </SectionCard>

      <SectionCard title="4 · Growth & Territory" section={4} onSave={() => saveSection(4, {
        annual_growth_targets: growthTargets, priority_territories: territories,
        growth_speed_vs_quality: growthSpeed, scaling_concerns: scalingConcerns,
      })}>
        {ta(q('annual_growth_targets', 'Annual growth targets'), growthTargets, setGrowthTargets, 2)}
        {ta(q('priority_territories', 'Priority UK territories'), territories, setTerritories, 2)}
        {ta(q('growth_speed_vs_quality', 'Balancing growth speed vs. quality'), growthSpeed, setGrowthSpeed)}
        {ta(q('scaling_concerns', 'Biggest scaling concern'), scalingConcerns, setScalingConcerns)}
      </SectionCard>

      <SectionCard title="5 · Recruitment Process" section={5} onSave={() => saveSection(5, {
        inquiry_channels: inquiryChannels, screening_method: screeningMethod,
        approval_timing: approvalTiming, approval_authority: approvalAuthority,
        timeline_inquiry_to_contract: timelineContract, post_signing_activities: postSigning,
        timeline_signing_to_launch: timelineLaunch, process_bottlenecks: bottlenecks,
        recruitment_process_rating: rating || null,
      })}>
        {multiChips(q('inquiry_channels', 'Where enquiries come from'), opts('inquiry_channels', FALLBACK_INQUIRY_CHANNELS), inquiryChannels, setInquiryChannels)}
        {ta(q('screening_method', 'Screening process (step by step)'), screeningMethod, setScreeningMethod, 4)}
        {ta(q('approval_timing', 'When approval decision is made'), approvalTiming, setApprovalTiming, 2)}
        {ta(q('approval_authority', 'Final sign-off authority'), approvalAuthority, setApprovalAuthority, 2)}
        {ta(q('timeline_inquiry_to_contract', 'Timeline: enquiry to contract'), timelineContract, setTimelineContract, 2)}
        {ta(q('post_signing_activities', 'Post-signing onboarding activities'), postSigning, setPostSigning)}
        {ta(q('timeline_signing_to_launch', 'Timeline: signing to opening'), timelineLaunch, setTimelineLaunch, 2)}
        {ta(q('process_bottlenecks', 'Biggest recruitment bottlenecks'), bottlenecks, setBottlenecks)}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">{q('recruitment_process_rating', 'Recruitment process self-rating (1–10)')}</label>
          <div className="flex gap-1.5">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${rating === n ? 'bg-brand-green text-white border-brand-green' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                {n}
              </button>
            ))}
          </div>
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
