'use client'

import { useState } from 'react'
import Image from 'next/image'
import { DualRangeSlider, INVESTMENT_STEPS } from '@/components/questionnaire/DualRangeSlider'
import { SingleSlider } from '@/components/questionnaire/SingleSlider'
import { GradientRating } from '@/components/questionnaire/GradientRating'
import { StepBuilder } from '@/components/questionnaire/StepBuilder'
import { OperatingModelCards } from '@/components/questionnaire/OperatingModelCards'

interface Props {
  franchisorId: string | null
  userId: string
  firstName: string
  brandName?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingAnswers?: Record<string, any> | null
}

type Answers = {
  // Brand identity
  brand_name: string                    // REQUIRED · profile field

  // Section 1 — The Business
  core_model: string
  competitive_advantage: string
  revenue_streams: string
  high_performing_unit: string
  underperformance_reasons: string
  format_types: string[]                // REQUIRED · profile field

  // Section 2 — Investment & Commercials
  investment_min: number                // REQUIRED · profile field
  investment_max: number                // REQUIRED · profile field
  investment_range_raw: string          // breakdown notes
  liquid_capital_min: number            // REQUIRED · profile field
  franchise_fee: string                 // REQUIRED · profile field
  royalty_pct: string                   // REQUIRED · profile field
  marketing_levy_pct: string            // profile field
  financial_metrics_shared: string
  common_objections: string
  break_even_months: number
  break_even_timeline: string           // context / caveats
  underestimated_costs: string

  // Section 3 — Ideal Franchisee
  ideal_franchisee_profile: string
  background_experience: string         // required / preferred experience (free text)
  experience_required: string           // REQUIRED · profile field
  full_time_required: boolean | null    // REQUIRED · profile field
  single_franchise_licenses: boolean | null // REQUIRED · profile field
  approval_factors: string[]
  operating_model_raw: string           // REQUIRED · profile field
  decline_reasons: string[]
  problematic_behaviours: string
  success_definition: string

  // Section 4 — Growth & Territory
  locations_available: string[]         // REQUIRED · profile field
  priority_territories: string
  growth_target_units: number
  annual_growth_targets: string
  scaling_concerns: string
  timeline_months: number               // REQUIRED · profile field
  inquiry_channels: string[]

  // Section 5 — Recruitment Process
  screening_steps: string[]
  approval_timing: string
  approval_authority: string
  timeline_inquiry_to_contract: string
  post_signing_activities: string
  timeline_signing_to_launch: string
  process_bottlenecks: string
  recruitment_process_rating: number
}

// ── Options ─────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS = [
  { value: 'dine-in',  label: '🍽️ Dine-in' },
  { value: 'takeaway', label: '🥡 Takeaway' },
  { value: 'kiosk',    label: '🏪 Kiosk' },
  { value: 'delivery', label: '🚴 Delivery' },
  { value: 'flexible', label: '🔄 Flexible' },
]

const EXPERIENCE_OPTIONS = [
  { value: 'none',           label: 'No prior experience required',     icon: '✅' },
  { value: 'management',    label: 'Management experience preferred',   icon: '📋' },
  { value: 'food-beverage', label: 'Food & beverage background needed', icon: '🍽️' },
]

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

const UK_CITY_OPTIONS = [
  'london', 'manchester', 'birmingham', 'leeds', 'liverpool',
  'glasgow', 'edinburgh', 'bristol', 'sheffield', 'nottingham',
  'cardiff', 'leicester', 'coventry', 'bradford', 'belfast',
]

const SECTIONS = [
  { title: 'The Business',             subtitle: 'Help us understand your concept and what franchisees actually do.' },
  { title: 'Investment & Commercials', subtitle: 'Investment requirements and the commercial terms you offer franchisees.' },
  { title: 'Ideal Franchisee',         subtitle: "Who you're looking for and why some applications succeed or fail." },
  { title: 'Growth & Territory',       subtitle: 'Your expansion plans, priorities and where enquiries come from.' },
  { title: 'Recruitment Process',      subtitle: 'Walk us through how you find, screen, and onboard new franchisees.' },
]

const TOTAL_SECTIONS = 5

// ── Build initial answers from DB data ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildInitialAnswers(brandName?: string | null, existing?: Record<string, any> | null): Answers {
  const DEFAULTS: Answers = {
    brand_name: brandName ?? '',
    core_model: '',
    competitive_advantage: '',
    revenue_streams: '',
    high_performing_unit: '',
    underperformance_reasons: '',
    format_types: [],
    investment_min: INVESTMENT_STEPS[1],   // £20k
    investment_max: INVESTMENT_STEPS[9],   // £100k
    investment_range_raw: '',
    liquid_capital_min: 20000,
    franchise_fee: '',
    royalty_pct: '',
    marketing_levy_pct: '',
    financial_metrics_shared: '',
    common_objections: '',
    break_even_months: 18,
    break_even_timeline: '',
    underestimated_costs: '',
    ideal_franchisee_profile: '',
    background_experience: '',
    experience_required: '',
    full_time_required: null,
    single_franchise_licenses: null,
    approval_factors: [],
    operating_model_raw: '',
    decline_reasons: [],
    problematic_behaviours: '',
    success_definition: '',
    locations_available: [],
    priority_territories: '',
    growth_target_units: 5,
    annual_growth_targets: '',
    scaling_concerns: '',
    timeline_months: 6,
    inquiry_channels: [],
    screening_steps: ['Initial enquiry call', 'Application form', 'Discovery day'],
    approval_timing: '',
    approval_authority: '',
    timeline_inquiry_to_contract: '',
    post_signing_activities: '',
    timeline_signing_to_launch: '',
    process_bottlenecks: '',
    recruitment_process_rating: 0,
  }

  if (!existing) return DEFAULTS

  const e = existing
  return {
    brand_name:               brandName ?? '',
    core_model:               e.core_model               ?? '',
    competitive_advantage:    e.competitive_advantage    ?? '',
    revenue_streams:          e.revenue_streams          ?? '',
    high_performing_unit:     e.high_performing_unit     ?? '',
    underperformance_reasons: e.underperformance_reasons ?? '',
    format_types:             e.format_types             ?? [],
    investment_min:           e.investment_min           ?? INVESTMENT_STEPS[1],   // £20k
    investment_max:           e.investment_max           ?? INVESTMENT_STEPS[9],   // £100k
    investment_range_raw:     e.investment_range_raw     ?? '',
    liquid_capital_min:       e.liquid_capital_min       ?? 20000,
    franchise_fee:            e.franchise_fee   != null  ? String(e.franchise_fee)        : '',
    royalty_pct:              e.royalty_pct     != null  ? String(e.royalty_pct)           : '',
    marketing_levy_pct:       e.marketing_levy_pct != null ? String(e.marketing_levy_pct) : '',
    financial_metrics_shared: e.financial_metrics_shared ?? '',
    common_objections:        e.common_objections        ?? '',
    break_even_months:        e.break_even_months        ?? 18,
    break_even_timeline:      e.break_even_timeline      ?? '',
    underestimated_costs:     e.underestimated_costs     ?? '',
    ideal_franchisee_profile: e.ideal_franchisee_profile ?? '',
    background_experience:    e.background_experience    ?? '',
    experience_required:      e.experience_required      ?? '',
    full_time_required:       e.full_time_required       ?? null,
    single_franchise_licenses: e.single_franchise_licenses ?? null,
    approval_factors:         e.approval_factors         ?? [],
    operating_model_raw:      e.operating_model_raw      ?? '',
    decline_reasons:          e.decline_reasons          ?? [],
    problematic_behaviours:   e.problematic_behaviours   ?? '',
    success_definition:       e.success_definition       ?? '',
    locations_available:      e.locations_available      ?? [],
    priority_territories:     e.priority_territories     ?? '',
    growth_target_units:      e.growth_target_units      ?? 5,
    annual_growth_targets:    e.annual_growth_targets    ?? '',
    scaling_concerns:         e.scaling_concerns         ?? '',
    timeline_months:          e.timeline_months          ?? 6,
    inquiry_channels:         e.inquiry_channels         ?? [],
    screening_steps:          (Array.isArray(e.screening_steps) && e.screening_steps.length)
                                ? e.screening_steps
                                : ['Initial enquiry call', 'Application form', 'Discovery day'],
    approval_timing:          e.approval_timing               ?? '',
    approval_authority:       e.approval_authority            ?? '',
    timeline_inquiry_to_contract: e.timeline_inquiry_to_contract ?? '',
    post_signing_activities:  e.post_signing_activities       ?? '',
    timeline_signing_to_launch: e.timeline_signing_to_launch  ?? '',
    process_bottlenecks:      e.process_bottlenecks           ?? '',
    recruitment_process_rating: e.recruitment_process_rating  ?? 0,
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateSection(section: number, a: Answers): string[] {
  const errors: string[] = []
  if (section === 1) {
    if (!a.format_types.length) errors.push('Please select at least one franchise format.')
  }
  if (section === 2) {
    if (!a.franchise_fee.trim()) errors.push('Franchise fee is required.')
    if (!a.royalty_pct.trim())   errors.push('Royalty % is required.')
  }
  if (section === 3) {
    if (!a.experience_required)               errors.push('Please select an experience level.')
    if (a.full_time_required === null)         errors.push('Please answer: is full-time commitment required?')
    if (a.single_franchise_licenses === null) errors.push('Please answer: do you grant single-location licences?')
    if (!a.operating_model_raw)               errors.push('Please choose an operating model.')
  }
  if (section === 4) {
    if (!a.locations_available.length) errors.push('Please select at least one target location.')
  }
  return errors
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function ProfileBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3a4a3a]/10 text-[#3a4a3a] text-[10px] font-semibold uppercase tracking-wide ml-2 align-middle">
      <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 0a3 3 0 1 1 0 6A3 3 0 0 1 6 0ZM1 11.2C1 9 3.24 7.2 6 7.2s5 1.8 5 4H1Z" />
      </svg>
      Profile field
    </span>
  )
}

function Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  const [local, setLocal] = useState(value)
  return (
    <textarea
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3a4a3a] focus:border-transparent resize-none text-slate-800 placeholder:text-slate-400"
    />
  )
}

function ShortInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [local, setLocal] = useState(value)
  return (
    <input
      type="text"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3a4a3a] focus:border-transparent text-slate-800 placeholder:text-slate-400"
    />
  )
}

function MultiSelect({ options, selected, onChange }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt} type="button"
          onClick={() => onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt])}
          className={`px-3 py-2 rounded-lg text-sm border transition-colors ${selected.includes(opt) ? 'bg-[#3a4a3a] text-white border-[#3a4a3a]' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3">
      {([{ label: 'Yes', val: true }, { label: 'No', val: false }] as const).map(opt => (
        <button
          key={opt.label} type="button" onClick={() => onChange(opt.val)}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm border transition-colors font-medium ${value === opt.val ? 'bg-[#3a4a3a] text-white border-[#3a4a3a]' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SubLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <p className="text-xs font-medium text-slate-600 mb-1.5">
      {children}
      {optional && <span className="text-slate-400 font-normal ml-1">(optional)</span>}
    </p>
  )
}

function QuestionBlock({ number, question, hint, required, children }: {
  number: number; question: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <span className="w-6 h-6 rounded-full bg-[#3a4a3a] text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
          {number}
        </span>
        <div>
          <p className="text-sm font-medium text-slate-800 leading-relaxed">
            {question}
            {required && <ProfileBadge />}
          </p>
          {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="pl-9">{children}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingQuiz({ franchisorId, firstName, brandName, existingAnswers }: Props) {
  const hasExisting = !!existingAnswers

  const [answers, setAnswers] = useState<Answers>(() =>
    buildInitialAnswers(brandName, existingAnswers)
  )
  // If they have saved progress, skip the welcome screen and land on section 1
  const [step, setStep] = useState(() => hasExisting ? 1 : 0)
  // Track the profile ID — may be created on first PATCH if franchisorId was null
  const [fid, setFid] = useState(franchisorId)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sectionErrors, setSectionErrors] = useState<string[]>([])
  const [brandNameError, setBrandNameError] = useState(false)

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  const progressPct = step === 0 ? 0 : Math.min(Math.round(((step - 1) / TOTAL_SECTIONS) * 100), 95)

  // ── Auto-save current answers to DB (non-blocking for navigation) ──────────
  async function autoSave(currentFid: string | null, currentAnswers: Answers): Promise<string | null> {
    setSaving(true)
    setSaveError(false)
    try {
      const res = await fetch('/api/franchisor/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: currentAnswers, franchisorId: currentFid }),
      })
      const data = await res.json()
      if (res.ok && data.franchisorId) {
        if (!currentFid) setFid(data.franchisorId)
        return data.franchisorId
      } else {
        setSaveError(true)
      }
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
    return currentFid
  }

  async function handleNext() {
    const errors = validateSection(step, answers)
    if (errors.length) { setSectionErrors(errors); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setSectionErrors([])

    // Auto-save progress before advancing — creates profile on first save
    const updatedFid = await autoSave(fid, answers)
    if (updatedFid && !fid) setFid(updatedFid)

    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    const errors = validateSection(step, answers)
    if (errors.length) { setSectionErrors(errors); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setSectionErrors([])
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/franchisor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, franchisorId: fid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unexpected error')
      setStep(6)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  // ── Welcome ────────────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <Image src="/logo-icon.png" alt="Franchise Foundry" width={64} height={64} className="mx-auto mb-8" />
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Welcome, {firstName}</h1>
          <p className="text-slate-600 leading-relaxed mb-6">
            Before you access the portal, we&apos;d like to learn more about your franchise. This helps us match you
            with the right candidates and brief our team properly.
          </p>

          {/* Brand name — collected upfront so we can identify them immediately */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 text-left">
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              What is your franchise brand name? <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-slate-400 mb-3">This is how your brand will appear throughout the portal</p>
            <input
              type="text"
              value={answers.brand_name}
              onChange={e => { set('brand_name', e.target.value); if (e.target.value.trim()) setBrandNameError(false) }}
              placeholder="e.g. Pizza Palace"
              className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3a4a3a] focus:border-transparent text-slate-800 placeholder:text-slate-400 ${brandNameError ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
            />
            {brandNameError && (
              <p className="text-xs text-red-500 mt-1.5">Please enter your brand name to continue</p>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-left space-y-3">
            <p className="text-sm font-semibold text-slate-800">What to expect</p>
            {[
              '5 sections · takes around 15 minutes',
              'Your progress saves automatically — pick up where you left off any time',
              'Your answers are only seen by the Franchise Foundry team',
              'Fields marked "Profile field" feed directly into your profile and matching',
            ].map(item => (
              <div key={item} className="flex gap-2 text-sm text-slate-600">
                <span className="text-[#3a4a3a] font-bold shrink-0">✓</span>
                {item}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              if (!answers.brand_name.trim()) { setBrandNameError(true); return }
              setStep(1)
            }}
            className="w-full bg-[#3a4a3a] hover:bg-[#2d3b2d] text-white font-semibold py-3.5 px-6 rounded-xl transition-colors text-sm"
          >
            Let&apos;s get started →
          </button>
        </div>
      </div>
    )
  }

  // ── Submitted — under review ───────────────────────────────────────────────
  if (step === 6) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-6 text-3xl">
              📋
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Questionnaire submitted</h1>
            <p className="text-slate-600 leading-relaxed mb-6">
              Thank you, {firstName} — your answers have been saved. A member of the Franchise Foundry team
              will review your submission and be in touch shortly to discuss next steps and grant you
              full access to the portal.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 mb-6">
              {[
                "We'll review your brand and questionnaire",
                "A consultant will reach out within 1–2 business days",
                "Once approved, you'll get full access to your portal and matched candidates",
              ].map(item => (
                <div key={item} className="flex gap-2 text-sm text-slate-600">
                  <span className="text-brand-green font-bold shrink-0">✓</span>
                  {item}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Questions? Email us at{' '}
              <a href="mailto:hello@franchisefoundry.co.uk" className="underline hover:text-slate-600">
                hello@franchisefoundry.co.uk
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  const currentSection = SECTIONS[step - 1]
  const isLastSection = step === TOTAL_SECTIONS

  // Cumulative visible-block offsets per section
  // S1=5, S2=6, S3=8, S4=5, S5=6
  const Q_OFFSETS = [0, 5, 11, 19, 24]
  const qOffset = Q_OFFSETS[step - 1]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-slate-200 fixed top-0 left-0 right-0 z-50">
        <div className="h-full bg-[#3a4a3a] transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Image src="/logo-icon.png" alt="Franchise Foundry" width={32} height={32} />
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Section {step} of {TOTAL_SECTIONS}
              {answers.brand_name && (
                <span className="ml-2 text-slate-500 normal-case tracking-normal font-semibold">
                  · {answers.brand_name}
                </span>
              )}
            </p>
            <h2 className="text-lg font-bold text-slate-900">{currentSection.title}</h2>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">{progressPct}% complete</p>
            {saving && <p className="text-xs text-slate-400 mt-0.5">Saving…</p>}
            {saveError && <p className="text-xs text-amber-500 mt-0.5">Save failed — will retry</p>}
          </div>
        </div>

        {/* Resume banner */}
        {hasExisting && step === 1 && (
          <div className="flex items-center gap-2 bg-[#3a4a3a]/5 border border-[#3a4a3a]/20 rounded-xl px-4 py-2.5 mb-6 ml-11">
            <span className="text-[#3a4a3a]">📂</span>
            <p className="text-xs text-[#3a4a3a] font-medium">Progress restored — your previous answers are pre-filled</p>
          </div>
        )}

        <p className="text-sm text-slate-500 mb-8 leading-relaxed pl-11">{currentSection.subtitle}</p>

        {/* Validation errors */}
        {sectionErrors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
            {sectionErrors.map(e => (
              <p key={e} className="text-sm text-red-700 flex gap-2"><span>⚠</span>{e}</p>
            ))}
          </div>
        )}

        <div className="space-y-10">

          {/* ── Section 1 — The Business ───────────────────────────────────── */}
          {step === 1 && (
            <>
              <QuestionBlock
                number={qOffset + 1}
                question="In one paragraph, describe your core business model — what a franchisee does day-to-day and how the business makes money."
              >
                <Textarea value={answers.core_model} onChange={v => set('core_model', v)}
                  placeholder="Daily operations, customer interactions, main revenue streams, what running a unit looks like…" />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 2}
                question="What is your competitive advantage? Why would a customer choose you over the competition?"
              >
                <Textarea value={answers.competitive_advantage} onChange={v => set('competitive_advantage', v)}
                  placeholder="Product differentiation, price point, brand, experience, technology…" />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 3}
                question="What are your main revenue streams? How does a franchisee generate income?"
              >
                <Textarea value={answers.revenue_streams} onChange={v => set('revenue_streams', v)}
                  placeholder="Dine-in sales, takeaway, delivery, catering, merchandise, franchise fees…" />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 4}
                question="Unit performance"
                hint="Two quick questions about what good and poor performance looks like"
              >
                <div className="space-y-4">
                  <div>
                    <SubLabel>What does a high-performing unit look like?</SubLabel>
                    <Textarea value={answers.high_performing_unit} onChange={v => set('high_performing_unit', v)}
                      rows={3} placeholder="e.g. Top-performing sites turn £X per week, with a team of 10…" />
                  </div>
                  <div>
                    <SubLabel>What are the most common reasons a unit underperforms?</SubLabel>
                    <Textarea value={answers.underperformance_reasons} onChange={v => set('underperformance_reasons', v)}
                      rows={3} placeholder="Location, franchisee engagement, local competition, operational issues…" />
                  </div>
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 5}
                question="What formats does your franchise operate in?"
                required
                hint="Select all that apply — this helps us match candidates who fit your model"
              >
                <div className="flex flex-wrap gap-2">
                  {FORMAT_OPTIONS.map(fmt => (
                    <button
                      key={fmt.value} type="button"
                      onClick={() => set('format_types', answers.format_types.includes(fmt.value)
                        ? answers.format_types.filter(f => f !== fmt.value)
                        : [...answers.format_types, fmt.value])}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors ${answers.format_types.includes(fmt.value) ? 'bg-[#3a4a3a] text-white border-[#3a4a3a]' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </QuestionBlock>
            </>
          )}

          {/* ── Section 2 — Investment & Commercials ────────────────────────── */}
          {step === 2 && (
            <>
              <QuestionBlock
                number={qOffset + 1}
                question="What is the total investment range to open a franchise?"
                required
                hint="Drag the handles to set your minimum and maximum"
              >
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <DualRangeSlider
                    min={answers.investment_min}
                    max={answers.investment_max}
                    onChange={(mn, mx) => { set('investment_min', mn); set('investment_max', mx) }}
                    variant="dark"
                  />
                </div>
                <div className="mt-3">
                  <SubLabel optional>Investment breakdown notes</SubLabel>
                  <Textarea value={answers.investment_range_raw} onChange={v => set('investment_range_raw', v)}
                    rows={2} placeholder="e.g. Includes fit-out £40k, equipment £20k, working capital £15k, franchise fee £25k…" />
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 2}
                question="What is the minimum liquid capital a franchisee must have available on day one?"
                required
                hint="Cash in hand — separate from any financed portion of the investment"
              >
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <SingleSlider
                    value={answers.liquid_capital_min}
                    min={5000} max={200000} step={5000}
                    format={v => `£${v.toLocaleString()}`}
                    lowLabel="£5k" highLabel="£200k+"
                    onChange={v => set('liquid_capital_min', v)}
                    variant="dark"
                  />
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 3}
                question="What are your commercial terms?"
                required
                hint="These feed directly into your profile — be as accurate as possible"
              >
                <div className="grid gap-4">
                  <div>
                    <SubLabel>Franchise fee <span className="text-red-400">*</span></SubLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">£</span>
                      <input
                        type="number" min="0" step="500"
                        value={answers.franchise_fee}
                        onChange={e => set('franchise_fee', e.target.value)}
                        placeholder="e.g. 25000"
                        className="w-full pl-7 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3a4a3a] focus:border-transparent text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <SubLabel>Royalty <span className="text-red-400">*</span></SubLabel>
                      <div className="relative">
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={answers.royalty_pct}
                          onChange={e => set('royalty_pct', e.target.value)}
                          placeholder="e.g. 7"
                          className="w-full pl-4 pr-8 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3a4a3a] focus:border-transparent text-slate-800"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">%</span>
                      </div>
                    </div>
                    <div>
                      <SubLabel optional>Marketing levy</SubLabel>
                      <div className="relative">
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={answers.marketing_levy_pct}
                          onChange={e => set('marketing_levy_pct', e.target.value)}
                          placeholder="e.g. 2"
                          className="w-full pl-4 pr-8 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3a4a3a] focus:border-transparent text-slate-800"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 4}
                question="Financials with prospective franchisees"
                hint="Two questions about what you share and what you typically hear back"
              >
                <div className="space-y-4">
                  <div>
                    <SubLabel>What financial metrics or P&amp;L data do you share during recruitment?</SubLabel>
                    <Textarea value={answers.financial_metrics_shared} onChange={v => set('financial_metrics_shared', v)}
                      rows={3} placeholder="Average unit revenue, EBITDA, margins, FDD disclosure…" />
                  </div>
                  <div>
                    <SubLabel>What are the most common financial objections you hear from prospective franchisees?</SubLabel>
                    <Textarea value={answers.common_objections} onChange={v => set('common_objections', v)}
                      rows={3} placeholder="'The fee is too high', 'I don't have enough liquid capital', 'The payback is too long'…" />
                  </div>
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 5}
                question="What is a realistic break-even timeline for a new franchisee?"
                hint="Slide to select the typical number of months"
              >
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <SingleSlider
                    value={answers.break_even_months}
                    min={1} max={48}
                    format={v => v === 48 ? '48+ months' : `${v} month${v === 1 ? '' : 's'}`}
                    lowLabel="1 month" highLabel="48+ months"
                    onChange={v => set('break_even_months', v)}
                    variant="dark"
                  />
                </div>
                <div className="mt-3">
                  <SubLabel optional>Context / caveats</SubLabel>
                  <Textarea value={answers.break_even_timeline} onChange={v => set('break_even_timeline', v)}
                    rows={2} placeholder="e.g. Varies by location — city centres typically 12 months, suburban 18–24 months…" />
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 6}
                question="What costs do new franchisees most commonly underestimate?"
              >
                <Textarea value={answers.underestimated_costs} onChange={v => set('underestimated_costs', v)}
                  placeholder="Working capital, staffing, local marketing, fit-out overruns, software subscriptions…" />
              </QuestionBlock>
            </>
          )}

          {/* ── Section 3 — Ideal Franchisee ────────────────────────────────── */}
          {step === 3 && (
            <>
              <QuestionBlock
                number={qOffset + 1}
                question="Describe your ideal franchisee — background, personality, experience, and what typically motivates them."
              >
                <div className="space-y-4">
                  <div>
                    <SubLabel>Ideal franchisee profile</SubLabel>
                    <Textarea value={answers.ideal_franchisee_profile} onChange={v => set('ideal_franchisee_profile', v)}
                      rows={3} placeholder="Age range, professional background, management experience, lifestyle, motivations…" />
                  </div>
                  <div>
                    <SubLabel optional>Required / preferred background or experience</SubLabel>
                    <Textarea value={answers.background_experience} onChange={v => set('background_experience', v)}
                      rows={3} placeholder="e.g. 3+ years in hospitality management, P&L responsibility, team leadership experience…" />
                  </div>
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 2}
                question="What is the minimum experience level required from a franchisee?"
                required
                hint="This feeds directly into matching — be honest so we surface the right candidates"
              >
                <div className="space-y-2">
                  {EXPERIENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.value} type="button"
                      onClick={() => set('experience_required', opt.value)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-colors ${answers.experience_required === opt.value ? 'bg-[#3a4a3a] text-white border-[#3a4a3a]' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 3}
                question="A couple of quick ones"
                required
              >
                <div className="space-y-4">
                  <div>
                    <SubLabel>Is full-time commitment required from the franchisee?</SubLabel>
                    <p className="text-xs text-slate-400 mb-2">Some franchisees prefer semi-passive ownership — be clear about your expectation</p>
                    <YesNo value={answers.full_time_required} onChange={v => set('full_time_required', v)} />
                  </div>
                  <div className="pt-1">
                    <SubLabel>Do you grant single-location franchise licences?</SubLabel>
                    <YesNo value={answers.single_franchise_licenses} onChange={v => set('single_franchise_licenses', v)} />
                  </div>
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 4}
                question="What are your top factors when approving a franchisee application? Select all that apply."
              >
                <MultiSelect options={APPROVAL_FACTOR_OPTIONS} selected={answers.approval_factors}
                  onChange={v => set('approval_factors', v)} />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 5}
                question="Do you require the franchisee to be hands-on (owner-operator), or can they hire a manager to run the business?"
                required
              >
                <OperatingModelCards value={answers.operating_model_raw}
                  onChange={v => set('operating_model_raw', v)} variant="dark" />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 6}
                question="What are the most common reasons you decline a franchisee application? Select all that apply."
              >
                <MultiSelect options={DECLINE_REASON_OPTIONS} selected={answers.decline_reasons}
                  onChange={v => set('decline_reasons', v)} />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 7}
                question="Are there types of franchisee that haven't worked out well for you? What went wrong?"
                hint="Helps us filter out poor-fit candidates before they reach you"
              >
                <Textarea value={answers.problematic_behaviours} onChange={v => set('problematic_behaviours', v)}
                  placeholder="Over-delegators, absentee owners, those who ignored the system, people who wanted to reinvent rather than follow the model…" />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 8}
                question="How do you define success for a franchisee in your network?"
                hint="Financial targets, lifestyle, brand standards — what does 'winning' look like for your franchisees?"
              >
                <Textarea value={answers.success_definition} onChange={v => set('success_definition', v)}
                  placeholder="Financial targets, customer satisfaction scores, brand standards adherence, community engagement, profitability milestones…" />
              </QuestionBlock>
            </>
          )}

          {/* ── Section 4 — Growth & Territory ──────────────────────────────── */}
          {step === 4 && (
            <>
              <QuestionBlock
                number={qOffset + 1}
                question="Which UK cities or regions are you actively seeking franchisees in?"
                required
                hint="This is a hard filter in our matching algorithm"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {UK_CITY_OPTIONS.map(city => (
                    <button
                      key={city} type="button"
                      onClick={() => set('locations_available', answers.locations_available.includes(city)
                        ? answers.locations_available.filter(c => c !== city)
                        : [...answers.locations_available, city])}
                      className={`px-3 py-1.5 rounded-full text-sm border capitalize transition-colors ${answers.locations_available.includes(city) ? 'bg-[#3a4a3a] text-white border-[#3a4a3a]' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                    >
                      {city.charAt(0).toUpperCase() + city.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  <div>
                    <SubLabel optional>Other locations (comma-separated)</SubLabel>
                    <input
                      type="text"
                      placeholder="e.g. Cambridge, Oxford, Brighton"
                      defaultValue={answers.locations_available.filter(l => !UK_CITY_OPTIONS.includes(l)).join(', ')}
                      onBlur={e => {
                        const custom = e.target.value.split(',').map(l => l.trim().toLowerCase()).filter(Boolean)
                        const presets = answers.locations_available.filter(l => UK_CITY_OPTIONS.includes(l))
                        set('locations_available', [...presets, ...custom])
                      }}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3a4a3a] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <SubLabel optional>Priority territories — which areas are you most focused on right now?</SubLabel>
                    <Textarea value={answers.priority_territories} onChange={v => set('priority_territories', v)}
                      rows={2} placeholder="e.g. Greater Manchester, West Yorkshire, Glasgow — avoiding Central London for now…" />
                  </div>
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 2}
                question="How many new franchise units are you targeting to open per year?"
                hint="Slide to set your target, then add any useful context below"
              >
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <SingleSlider
                    value={answers.growth_target_units}
                    min={1} max={50}
                    format={v => v === 50 ? '50+ units/year' : `${v} unit${v === 1 ? '' : 's'}/year`}
                    lowLabel="1 unit" highLabel="50+ units"
                    onChange={v => set('growth_target_units', v)}
                    variant="dark"
                  />
                </div>
                <div className="mt-3">
                  <SubLabel optional>Timeframe &amp; context</SubLabel>
                  <Textarea value={answers.annual_growth_targets} onChange={v => set('annual_growth_targets', v)}
                    rows={2} placeholder="e.g. Targeting 25 total by 2027, with 5–8 new units each year…" />
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 3}
                question="What is your biggest concern about scaling your franchise network over the next 2–3 years?"
              >
                <Textarea value={answers.scaling_concerns} onChange={v => set('scaling_concerns', v)}
                  placeholder="Maintaining quality, finding the right people, operational support capacity, brand consistency…" />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 4}
                question="How many months does it typically take from first enquiry to a franchisee opening?"
                required
                hint="Include training, fit-out, and launch preparation in your estimate"
              >
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <SingleSlider
                    value={answers.timeline_months}
                    min={1} max={36}
                    format={v => v === 36 ? '36+ months' : `${v} month${v === 1 ? '' : 's'}`}
                    lowLabel="1 month" highLabel="36+ months"
                    onChange={v => set('timeline_months', v)}
                    variant="dark"
                  />
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 5}
                question="Where do your franchise enquiries currently come from? Select all that apply."
              >
                <MultiSelect options={INQUIRY_CHANNEL_OPTIONS} selected={answers.inquiry_channels}
                  onChange={v => set('inquiry_channels', v)} />
              </QuestionBlock>
            </>
          )}

          {/* ── Section 5 — Recruitment Process ─────────────────────────────── */}
          {step === 5 && (
            <>
              <QuestionBlock
                number={qOffset + 1}
                question="Walk us through your screening process — from initial enquiry to approval decision."
                hint="Add each step below. Drag ↑↓ to reorder."
              >
                <StepBuilder
                  steps={answers.screening_steps}
                  onChange={v => set('screening_steps', v)}
                  placeholder="Describe this step…"
                  variant="dark"
                />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 2}
                question="Approval &amp; timelines"
                hint="Three quick questions about how and when decisions are made"
              >
                <div className="space-y-4">
                  <div>
                    <SubLabel>Who has final sign-off on approving a new franchisee?</SubLabel>
                    <ShortInput value={answers.approval_authority} onChange={v => set('approval_authority', v)}
                      placeholder="e.g. Franchise Director, MD, approval committee, founder…" />
                  </div>
                  <div>
                    <SubLabel>At what stage do you typically know whether you want to approve someone?</SubLabel>
                    <Textarea value={answers.approval_timing} onChange={v => set('approval_timing', v)}
                      rows={2} placeholder="Usually after the discovery day, or once we've seen the financial evidence…" />
                  </div>
                  <div>
                    <SubLabel>Typical time from first meeting to signed franchise agreement?</SubLabel>
                    <ShortInput value={answers.timeline_inquiry_to_contract}
                      onChange={v => set('timeline_inquiry_to_contract', v)}
                      placeholder="e.g. 6–12 weeks for motivated applicants, longer if finance is needed…" />
                  </div>
                </div>
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 3}
                question="What happens after the contract is signed? Describe your onboarding and pre-launch activities."
              >
                <Textarea value={answers.post_signing_activities} onChange={v => set('post_signing_activities', v)}
                  placeholder="Training programme, site selection, fit-out process, pre-opening marketing, launch support…" />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 4}
                question="What is the typical timeline from signed contract to opening day?"
              >
                <Textarea value={answers.timeline_signing_to_launch} onChange={v => set('timeline_signing_to_launch', v)}
                  rows={2} placeholder="e.g. 4–6 months, depending on site availability and fit-out…" />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 5}
                question="What are the biggest bottlenecks or frustrations in your current recruitment process?"
              >
                <Textarea value={answers.process_bottlenecks} onChange={v => set('process_bottlenecks', v)}
                  placeholder="Too many unqualified leads, long delays between stages, difficulty accessing decision-makers…" />
              </QuestionBlock>

              <QuestionBlock
                number={qOffset + 6}
                question="On a scale of 1–10, how would you rate your current franchise recruitment process?"
              >
                <GradientRating value={answers.recruitment_process_rating}
                  onChange={v => set('recruitment_process_rating', v)} />
              </QuestionBlock>
            </>
          )}
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-200">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => { setSectionErrors([]); setStep(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Back
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            {/* Inline save indicator */}
            {saving && <span className="text-xs text-slate-400">Saving…</span>}
            {saveError && !saving && <span className="text-xs text-amber-500">Save failed</span>}

            {isLastSection ? (
              <button
                type="button" onClick={handleSubmit} disabled={submitting || saving}
                className="bg-[#3a4a3a] hover:bg-[#2d3b2d] text-white font-semibold py-3 px-8 rounded-xl transition-colors text-sm disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit questionnaire →'}
              </button>
            ) : (
              <button
                type="button" onClick={handleNext} disabled={saving}
                className="bg-[#3a4a3a] hover:bg-[#2d3b2d] text-white font-semibold py-3 px-8 rounded-xl transition-colors text-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save & continue →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
