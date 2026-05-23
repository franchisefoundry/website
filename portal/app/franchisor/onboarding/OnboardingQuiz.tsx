'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Props {
  franchisorId: string | null
  userId: string
  firstName: string
}

type Answers = {
  // Section 1 — The Business
  core_model: string
  competitive_advantage: string
  revenue_streams: string
  high_performing_unit: string
  underperformance_reasons: string
  // Section 2 — Financials
  investment_range_raw: string
  commercial_rates: string
  financial_metrics_shared: string
  break_even_timeline: string
  underestimated_costs: string
  common_objections: string
  // Section 3 — Ideal Franchisee
  ideal_franchisee_profile: string
  background_experience: string
  approval_factors: string[]
  single_franchise_licenses: boolean | null
  operating_model_raw: string
  decline_reasons: string[]
  problematic_behaviours: string
  success_definition: string
  // Section 4 — Growth & Territory
  annual_growth_targets: string
  priority_territories: string
  growth_speed_vs_quality: string
  scaling_concerns: string
  // Section 5 — Recruitment Process
  inquiry_channels: string[]
  screening_method: string
  approval_timing: string
  approval_authority: string
  timeline_inquiry_to_contract: string
  post_signing_activities: string
  timeline_signing_to_launch: string
  process_bottlenecks: string
  recruitment_process_rating: number
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

const SECTIONS = [
  { title: 'The Business', subtitle: 'Help us understand your concept and what franchisees actually do.', count: 5 },
  { title: 'Financials', subtitle: 'Investment, returns, and what prospects need to know financially.', count: 6 },
  { title: 'Ideal Franchisee', subtitle: "Who you're looking for and why some applications succeed or fail.", count: 8 },
  { title: 'Growth & Territory', subtitle: 'Your expansion plans and priorities across the UK.', count: 4 },
  { title: 'Recruitment Process', subtitle: 'Walk us through how you find, screen, and onboard new franchisees.', count: 9 },
]

const TOTAL_QUESTIONS = 32

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3a4a3a] focus:border-transparent resize-none text-slate-800 placeholder:text-slate-400"
    />
  )
}

function MultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
            selected.includes(opt)
              ? 'bg-[#3a4a3a] text-white border-[#3a4a3a]'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex gap-3">
      {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(opt => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onChange(opt.val)}
          className={`flex-1 py-3 px-4 rounded-xl text-sm border transition-colors font-medium ${
            value === opt.val
              ? 'bg-[#3a4a3a] text-white border-[#3a4a3a]'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function RatingScale({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-colors ${
            value === n
              ? 'bg-[#3a4a3a] text-white border-[#3a4a3a]'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function QuestionBlock({ number, question, children }: { number: number; question: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <span className="w-6 h-6 rounded-full bg-[#3a4a3a] text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
          {number}
        </span>
        <p className="text-sm font-medium text-slate-800 leading-relaxed">{question}</p>
      </div>
      <div className="pl-9">{children}</div>
    </div>
  )
}

const EMPTY: Answers = {
  core_model: '',
  competitive_advantage: '',
  revenue_streams: '',
  high_performing_unit: '',
  underperformance_reasons: '',
  investment_range_raw: '',
  commercial_rates: '',
  financial_metrics_shared: '',
  break_even_timeline: '',
  underestimated_costs: '',
  common_objections: '',
  ideal_franchisee_profile: '',
  background_experience: '',
  approval_factors: [],
  single_franchise_licenses: null,
  operating_model_raw: '',
  decline_reasons: [],
  problematic_behaviours: '',
  success_definition: '',
  annual_growth_targets: '',
  priority_territories: '',
  growth_speed_vs_quality: '',
  scaling_concerns: '',
  inquiry_channels: [],
  screening_method: '',
  approval_timing: '',
  approval_authority: '',
  timeline_inquiry_to_contract: '',
  post_signing_activities: '',
  timeline_signing_to_launch: '',
  process_bottlenecks: '',
  recruitment_process_rating: 0,
}

export default function OnboardingQuiz({ franchisorId, userId, firstName }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0 = welcome, 1–5 = sections, 6 = done
  const [answers, setAnswers] = useState<Answers>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  const questionsAnsweredSoFar = (() => {
    let count = 0
    if (step >= 2) count += 5 // section 1
    if (step >= 3) count += 6 // section 2
    if (step >= 4) count += 8 // section 3
    if (step >= 5) count += 4 // section 4
    return count
  })()

  const progressPct = step === 0 ? 0 : Math.min(Math.round((questionsAnsweredSoFar / TOTAL_QUESTIONS) * 100), 95)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/franchisor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, franchisorId, userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unexpected error')
      setStep(6)
      setTimeout(() => router.push('/franchisor'), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  // ── Welcome screen ──────────────────────────────────────────────────────────
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
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-left space-y-3">
            <p className="text-sm font-semibold text-slate-800">What to expect</p>
            {[
              '5 sections · 32 questions',
              'Takes around 15–20 minutes',
              'Your answers are only seen by the Franchise Foundry team',
              'You can come back and update these at any time',
            ].map(item => (
              <div key={item} className="flex gap-2 text-sm text-slate-600">
                <span className="text-[#3a4a3a] font-bold shrink-0">✓</span>
                {item}
              </div>
            ))}
          </div>
          <button
            onClick={() => setStep(1)}
            className="w-full bg-[#3a4a3a] hover:bg-[#2d3b2d] text-white font-semibold py-3.5 px-6 rounded-xl transition-colors text-sm"
          >
            Let&apos;s get started →
          </button>
        </div>
      </div>
    )
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 6) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">All done!</h1>
          <p className="text-slate-600 leading-relaxed">
            Thank you — your answers have been saved. Taking you to your portal now…
          </p>
        </div>
      </div>
    )
  }

  const currentSection = SECTIONS[step - 1]
  const isLastSection = step === 5

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-slate-200 fixed top-0 left-0 right-0 z-50">
        <div
          className="h-full bg-[#3a4a3a] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Image src="/logo-icon.png" alt="Franchise Foundry" width={32} height={32} />
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Section {step} of 5
            </p>
            <h2 className="text-lg font-bold text-slate-900">{currentSection.title}</h2>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">{progressPct}% complete</p>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-8 leading-relaxed">{currentSection.subtitle}</p>

        {/* Questions */}
        <div className="space-y-8">
          {step === 1 && (
            <>
              <QuestionBlock number={1} question="In one paragraph, describe your core business model and what a franchisee actually does day-to-day.">
                <Textarea value={answers.core_model} onChange={v => set('core_model', v)} placeholder="Describe the daily operations, customer interactions, and what running a unit looks like..." />
              </QuestionBlock>
              <QuestionBlock number={2} question="What is your competitive advantage? Why would a customer choose you over the competition?">
                <Textarea value={answers.competitive_advantage} onChange={v => set('competitive_advantage', v)} placeholder="Product differentiation, price point, brand, experience, technology..." />
              </QuestionBlock>
              <QuestionBlock number={3} question="What are your revenue streams? (e.g. dine-in sales, delivery, catering, merchandise)">
                <Textarea value={answers.revenue_streams} onChange={v => set('revenue_streams', v)} rows={3} placeholder="List your main revenue streams and their relative contribution..." />
              </QuestionBlock>
              <QuestionBlock number={4} question="What does a high-performing unit look like? Include any metrics you're comfortable sharing — revenue, footfall, team size.">
                <Textarea value={answers.high_performing_unit} onChange={v => set('high_performing_unit', v)} placeholder="e.g. Top-performing sites turn £X per week, with a team of 10..." />
              </QuestionBlock>
              <QuestionBlock number={5} question="What are the most common reasons a franchise unit underperforms?">
                <Textarea value={answers.underperformance_reasons} onChange={v => set('underperformance_reasons', v)} placeholder="Location, franchisee engagement, local competition, operational issues..." />
              </QuestionBlock>
            </>
          )}

          {step === 2 && (
            <>
              <QuestionBlock number={6} question="What is the total investment required to open a franchise? Include fit-out, FF&E, franchise fee, and working capital.">
                <Textarea value={answers.investment_range_raw} onChange={v => set('investment_range_raw', v)} rows={3} placeholder="e.g. Total investment ranges from £X to £Y, broken down as: franchise fee £X, fit-out £X, working capital £X..." />
              </QuestionBlock>
              <QuestionBlock number={7} question="What are your commercial terms? Include franchise fee, royalty %, and any marketing levy.">
                <Textarea value={answers.commercial_rates} onChange={v => set('commercial_rates', v)} rows={3} placeholder="e.g. Franchise fee: £25,000. Royalty: 7% of net sales. Marketing levy: 2%..." />
              </QuestionBlock>
              <QuestionBlock number={8} question="What financial metrics or P&L data do you share with prospective franchisees during the recruitment process?">
                <Textarea value={answers.financial_metrics_shared} onChange={v => set('financial_metrics_shared', v)} placeholder="Average unit revenue, EBITDA, margins, FDD disclosure..." />
              </QuestionBlock>
              <QuestionBlock number={9} question="What is a realistic break-even timeline for a new franchisee?">
                <Textarea value={answers.break_even_timeline} onChange={v => set('break_even_timeline', v)} rows={2} placeholder="e.g. Most franchisees break even within 18–24 months..." />
              </QuestionBlock>
              <QuestionBlock number={10} question="What costs are most commonly underestimated by new franchisees?">
                <Textarea value={answers.underestimated_costs} onChange={v => set('underestimated_costs', v)} rows={3} placeholder="Staffing, initial marketing, working capital buffer, rates, fit-out overruns..." />
              </QuestionBlock>
              <QuestionBlock number={11} question="What are the most common financial objections you encounter from prospective franchisees?">
                <Textarea value={answers.common_objections} onChange={v => set('common_objections', v)} rows={3} placeholder="'The fee is too high', 'I don't have enough liquid capital', 'The payback is too long'..." />
              </QuestionBlock>
            </>
          )}

          {step === 3 && (
            <>
              <QuestionBlock number={12} question="Describe your ideal franchisee. What does their background typically look like?">
                <Textarea value={answers.ideal_franchisee_profile} onChange={v => set('ideal_franchisee_profile', v)} placeholder="Age range, professional background, personality type, lifestyle, motivations..." />
              </QuestionBlock>
              <QuestionBlock number={13} question="What specific background or experience do you require — or strongly prefer?">
                <Textarea value={answers.background_experience} onChange={v => set('background_experience', v)} rows={3} placeholder="Management experience, food & beverage background, business ownership, sales..." />
              </QuestionBlock>
              <QuestionBlock number={14} question="What are your top factors when approving a franchisee application? Select all that apply.">
                <MultiSelect options={APPROVAL_FACTOR_OPTIONS} selected={answers.approval_factors} onChange={v => set('approval_factors', v)} />
              </QuestionBlock>
              <QuestionBlock number={15} question="Do you grant single-location franchise licences?">
                <YesNo value={answers.single_franchise_licenses} onChange={v => set('single_franchise_licenses', v)} />
              </QuestionBlock>
              <QuestionBlock number={16} question="Do you require the franchisee to be hands-on (owner-operator), or can they hire a manager to run the business?">
                <div className="flex flex-col gap-2">
                  {[
                    { val: 'owner-operator', label: 'Must be owner-operator (hands-on)' },
                    { val: 'hire-manager', label: 'Can hire a manager (semi-passive)' },
                    { val: 'either', label: 'Either is acceptable' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => set('operating_model_raw', opt.val)}
                      className={`py-3 px-4 rounded-xl text-sm border text-left transition-colors ${
                        answers.operating_model_raw === opt.val
                          ? 'bg-[#3a4a3a] text-white border-[#3a4a3a]'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </QuestionBlock>
              <QuestionBlock number={17} question="What are the most common reasons you decline a franchisee application? Select all that apply.">
                <MultiSelect options={DECLINE_REASON_OPTIONS} selected={answers.decline_reasons} onChange={v => set('decline_reasons', v)} />
              </QuestionBlock>
              <QuestionBlock number={18} question="Describe a type of franchisee that historically hasn't worked well for your brand.">
                <Textarea value={answers.problematic_behaviours} onChange={v => set('problematic_behaviours', v)} placeholder="What behaviours, backgrounds, or mindsets tend to lead to poor outcomes?..." />
              </QuestionBlock>
              <QuestionBlock number={19} question="How do you define franchisee success beyond revenue? What does a great franchisee relationship look like to you?">
                <Textarea value={answers.success_definition} onChange={v => set('success_definition', v)} placeholder="Brand ambassadorship, team culture, growth ambition, community engagement..." />
              </QuestionBlock>
            </>
          )}

          {step === 4 && (
            <>
              <QuestionBlock number={20} question="How many new franchise units are you targeting to open per year, and over what timeframe?">
                <Textarea value={answers.annual_growth_targets} onChange={v => set('annual_growth_targets', v)} rows={2} placeholder="e.g. 5–8 units per year over the next 3 years, targeting 25 total by 2027..." />
              </QuestionBlock>
              <QuestionBlock number={21} question="Which UK cities or regions are your priority territories right now?">
                <Textarea value={answers.priority_territories} onChange={v => set('priority_territories', v)} rows={2} placeholder="e.g. Greater Manchester, West Yorkshire, Glasgow, Birmingham — avoiding Central London for now..." />
              </QuestionBlock>
              <QuestionBlock number={22} question="How do you balance growth speed vs. franchisee quality? What's your approach when there's tension between the two?">
                <Textarea value={answers.growth_speed_vs_quality} onChange={v => set('growth_speed_vs_quality', v)} placeholder="We never compromise on X, even if it means slower growth..." />
              </QuestionBlock>
              <QuestionBlock number={23} question="What is your biggest concern about scaling your franchise network over the next 2–3 years?">
                <Textarea value={answers.scaling_concerns} onChange={v => set('scaling_concerns', v)} placeholder="Maintaining quality, finding the right people, operational support capacity, brand consistency..." />
              </QuestionBlock>
            </>
          )}

          {step === 5 && (
            <>
              <QuestionBlock number={24} question="Where do your franchise enquiries currently come from? Select all that apply.">
                <MultiSelect options={INQUIRY_CHANNEL_OPTIONS} selected={answers.inquiry_channels} onChange={v => set('inquiry_channels', v)} />
              </QuestionBlock>
              <QuestionBlock number={25} question="Walk us through your screening process, from initial enquiry to approval decision.">
                <Textarea value={answers.screening_method} onChange={v => set('screening_method', v)} placeholder="Step 1: Initial call. Step 2: Application form. Step 3: Discovery day. Step 4: Due diligence. Step 5: Approval..." />
              </QuestionBlock>
              <QuestionBlock number={26} question="At what stage of the process do you typically know whether you want to approve someone?">
                <Textarea value={answers.approval_timing} onChange={v => set('approval_timing', v)} rows={2} placeholder="Usually after the discovery day, or once we've seen the financial evidence..." />
              </QuestionBlock>
              <QuestionBlock number={27} question="Who has final sign-off on approving a new franchisee?">
                <Textarea value={answers.approval_authority} onChange={v => set('approval_authority', v)} rows={2} placeholder="e.g. Franchise Director, MD, approval committee, founder..." />
              </QuestionBlock>
              <QuestionBlock number={28} question="What is your typical timeline from initial enquiry to signed franchise agreement?">
                <Textarea value={answers.timeline_inquiry_to_contract} onChange={v => set('timeline_inquiry_to_contract', v)} rows={2} placeholder="e.g. 6–12 weeks for motivated applicants, longer if finance is needed..." />
              </QuestionBlock>
              <QuestionBlock number={29} question="What happens after the contract is signed? Describe your onboarding and pre-launch activities.">
                <Textarea value={answers.post_signing_activities} onChange={v => set('post_signing_activities', v)} placeholder="Training programme, site selection, fit-out process, pre-opening marketing, launch support..." />
              </QuestionBlock>
              <QuestionBlock number={30} question="What is the typical timeline from signed contract to opening day?">
                <Textarea value={answers.timeline_signing_to_launch} onChange={v => set('timeline_signing_to_launch', v)} rows={2} placeholder="e.g. 4–6 months, depending on site availability and fit-out..." />
              </QuestionBlock>
              <QuestionBlock number={31} question="What are the biggest bottlenecks or frustrations in your current recruitment process?">
                <Textarea value={answers.process_bottlenecks} onChange={v => set('process_bottlenecks', v)} placeholder="Too many unqualified leads, long delays between stages, difficulty accessing decision-makers..." />
              </QuestionBlock>
              <QuestionBlock number={32} question="On a scale of 1–10, how would you rate your current franchise recruitment process?">
                <div className="space-y-2">
                  <RatingScale value={answers.recruitment_process_rating} onChange={v => set('recruitment_process_rating', v)} />
                  <div className="flex justify-between text-xs text-slate-400 px-1">
                    <span>Needs work</span>
                    <span>World-class</span>
                  </div>
                </div>
              </QuestionBlock>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-200">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {isLastSection ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#3a4a3a] hover:bg-[#2d3b2d] text-white font-semibold py-3 px-8 rounded-xl transition-colors text-sm disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit & go to portal →'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="bg-[#3a4a3a] hover:bg-[#2d3b2d] text-white font-semibold py-3 px-8 rounded-xl transition-colors text-sm"
            >
              Next section →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
