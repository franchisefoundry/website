'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UK_CITIES } from '@/lib/supabase/types'

const TOTAL_STEPS = 3
const STEP_LABELS = ['Investment', 'Your Vision', 'About You']

type Budget = { min: number; max: number; label: string; sub: string }
const BUDGETS: Budget[] = [
  { min: 0,      max: 50000,   label: 'Under £50k',    sub: 'Low entry' },
  { min: 50000,  max: 100000,  label: '£50k – £100k',  sub: 'Popular range' },
  { min: 100000, max: 200000,  label: '£100k – £200k', sub: 'Most options' },
  { min: 200000, max: 500000,  label: '£200k – £500k', sub: 'Premium brands' },
  { min: 500000, max: 1500000, label: 'Over £500k',    sub: 'Top-tier' },
]

const TIMELINES = [
  { value: '3',  label: 'Now',        sub: 'Ready to go' },
  { value: '3',  label: '1–3 months', sub: 'Very soon' },
  { value: '6',  label: '3–6 months', sub: 'Exploring' },
  { value: '12', label: '6–12 months',sub: 'Planning ahead' },
  { value: '24', label: '12+ months', sub: 'Future goal' },
]

type FormData = {
  budget: Budget | null
  timelineLabel: string
  timeline_months: string
  operator_model: string
  full_time_available: boolean
  multi_site_interest: boolean
  experience: string
  preferred_locations: string[]
  other_location: string
  goals: string
}

const initial: FormData = {
  budget: null,
  timelineLabel: '',
  timeline_months: '',
  operator_model: '',
  full_time_available: true,
  multi_site_interest: false,
  experience: '',
  preferred_locations: [],
  other_location: '',
  goals: '',
}

function Tile({ label, sub, selected, onClick }: { label: string; sub: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-center p-3 rounded-xl border-2 transition-colors cursor-pointer ${
        selected
          ? 'border-brand-green bg-brand-green/5 text-brand-green'
          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
      }`}>
      <div className="text-sm font-semibold leading-tight">{label}</div>
      <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
    </button>
  )
}

function RadioCard({ label, description, selected, onClick }: { label: string; description?: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
        selected ? 'border-brand-green bg-brand-green/5' : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}>
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </button>
  )
}

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-slate-600 border-slate-300 hover:border-brand-green'
      }`}>
      {label}
    </button>
  )
}

export default function QuizForm() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>(initial)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
    setError(null)
  }

  function toggleLocation(val: string) {
    setData(prev => ({
      ...prev,
      preferred_locations: prev.preferred_locations.includes(val)
        ? prev.preferred_locations.filter(v => v !== val)
        : [...prev.preferred_locations, val],
    }))
    setError(null)
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!data.budget) return 'Please select your investment budget.'
      if (!data.timeline_months) return 'Please select your timeline.'
    }
    if (step === 2) {
      if (!data.operator_model) return 'Please select how you plan to run the business.'
      if (!data.experience) return 'Please select your experience level.'
    }
    if (step === 3) {
      if (data.preferred_locations.length === 0 && !data.other_location.trim())
        return 'Please select at least one location or enter your preferred area.'
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
  }

  function back() {
    setError(null)
    setStep(s => s - 1)
  }

  function submit() {
    const err = validateStep()
    if (err) { setError(err); return }

    const params = new URLSearchParams()
    if (data.budget) {
      params.set('bmin', String(data.budget.min))
      params.set('bmax', String(data.budget.max))
    }
    params.set('op', data.operator_model)
    params.set('exp', data.experience)
    params.set('ft', String(data.full_time_available))
    params.set('ms', String(data.multi_site_interest))
    params.set('tl', data.timeline_months)
    if (data.preferred_locations.length) params.set('loc', data.preferred_locations.join(','))
    if (data.other_location.trim()) params.set('oloc', data.other_location.trim())
    if (data.goals.trim()) params.set('goals', data.goals.trim())

    router.push(`/get-matched/results?${params.toString()}`)
  }

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div className="max-w-xl mx-auto">
      {/* Hero copy */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/20 text-brand-green text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
          <span className="w-1.5 h-1.5 bg-brand-green rounded-full" />
          Matching Platform
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Find Your Match</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Our matching engine scores your profile against every hospitality brand in our network — investment level, how you want to operate, your background, your ambitions. No broker gut feel. No bias toward any particular brand. Just fit.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center mb-6">
        {STEP_LABELS.map((label, i) => {
          const num = i + 1
          const done = num < step
          const active = num === step
          return (
            <div key={num} className={`flex items-center ${num < TOTAL_STEPS ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done ? 'bg-brand-gold border-brand-gold text-white' : active ? 'bg-brand-green border-brand-green text-white' : 'border-slate-200 text-slate-400'
                }`}>
                  {done ? '✓' : num}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${active ? 'text-brand-green' : 'text-slate-400'}`}>{label}</span>
              </div>
              {num < TOTAL_STEPS && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 ${done ? 'bg-brand-gold' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-brand-green rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

        {/* Step 1 — Investment */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Let&apos;s find your match</h2>
              <p className="text-sm text-slate-500">Tell us about your investment and how quickly you want to move.</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Investment Budget</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {BUDGETS.map(b => (
                  <Tile key={b.label} label={b.label} sub={b.sub}
                    selected={data.budget?.label === b.label}
                    onClick={() => set('budget', b)} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">When do you want to start?</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TIMELINES.map(t => (
                  <Tile key={t.label} label={t.label} sub={t.sub}
                    selected={data.timelineLabel === t.label}
                    onClick={() => setData(prev => ({ ...prev, timelineLabel: t.label, timeline_months: t.value }))} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Your Vision */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Your Vision</h2>
              <p className="text-sm text-slate-500">Help us understand the kind of franchise that fits your lifestyle.</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">How do you plan to run it?</p>
              <div className="space-y-2">
                {[
                  { value: 'owner-operator', label: 'Hands-on', description: "I'll run it myself, day-to-day" },
                  { value: 'hire-manager', label: 'Hire a manager', description: 'Semi-passive — I oversee, a GM runs it' },
                  { value: 'either', label: 'Open to either', description: "Flexible — I'll see what fits" },
                ].map(opt => (
                  <RadioCard key={opt.value} label={opt.label} description={opt.description}
                    selected={data.operator_model === opt.value}
                    onClick={() => set('operator_model', opt.value)} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Full-time commitment?</p>
                {[{ v: true, l: 'Yes' }, { v: false, l: 'No / part-time' }].map(({ v, l }) => (
                  <RadioCard key={l} label={l} selected={data.full_time_available === v}
                    onClick={() => set('full_time_available', v)} />
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Multi-site ambition?</p>
                {[{ v: true, l: 'Yes, I want to grow' }, { v: false, l: 'Single site for now' }].map(({ v, l }) => (
                  <RadioCard key={l} label={l} selected={data.multi_site_interest === v}
                    onClick={() => set('multi_site_interest', v)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — About You */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">About You</h2>
              <p className="text-sm text-slate-500">A few final details to fine-tune your matches.</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your business background</p>
              <div className="space-y-2">
                {[
                  { value: 'none', label: 'First venture', description: 'New to business ownership' },
                  { value: 'management', label: 'Management experience', description: "I've led teams before" },
                  { value: 'food-beverage', label: 'F&B / hospitality', description: 'I know the industry' },
                ].map(opt => (
                  <RadioCard key={opt.value} label={opt.label} description={opt.description}
                    selected={data.experience === opt.value}
                    onClick={() => set('experience', opt.value)} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Where are you looking to open?</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {UK_CITIES.map(city => (
                  <TogglePill key={city.value} label={city.label}
                    active={data.preferred_locations.includes(city.value)}
                    onClick={() => toggleLocation(city.value)} />
                ))}
              </div>
              <input
                type="text"
                value={data.other_location}
                onChange={e => set('other_location', e.target.value)}
                placeholder="Other area not listed above…"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Anything else we should know? <span className="normal-case font-normal text-slate-400">(optional)</span></p>
              <textarea value={data.goals} onChange={e => set('goals', e.target.value)} rows={3}
                placeholder="e.g. I've managed teams in hospitality for 8 years and I'm looking to invest in a food concept in Manchester…"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none" />
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button type="button" onClick={back}
              className="flex-none border border-slate-300 text-slate-600 text-sm font-medium py-2.5 px-5 rounded-lg hover:bg-slate-50 transition-colors">
              ← Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={next}
              className="flex-1 bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
              Continue →
            </button>
          ) : (
            <button type="button" onClick={submit}
              className="flex-1 bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
              See my matches →
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">
        Takes 2 minutes &nbsp;·&nbsp; No obligation &nbsp;·&nbsp; Completely free
      </p>
    </div>
  )
}
