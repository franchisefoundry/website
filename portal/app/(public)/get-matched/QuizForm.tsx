'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UK_CITIES, SECTORS } from '@/lib/supabase/types'

const TOTAL_STEPS = 6

type FormData = {
  full_name: string
  email: string
  phone: string
  investment_min: string
  investment_max: string
  operator_model: string
  experience: string
  full_time_available: boolean
  multi_site_interest: boolean
  timeline_months: string
  preferred_locations: string[]
  sectors: string[]
  goals: string
}

const initial: FormData = {
  full_name: '',
  email: '',
  phone: '',
  investment_min: '',
  investment_max: '',
  operator_model: '',
  experience: '',
  full_time_available: true,
  multi_site_interest: false,
  timeline_months: '',
  preferred_locations: [],
  sectors: [],
  goals: '',
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function TogglePill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
        active
          ? 'bg-brand-green text-white border-brand-green'
          : 'bg-white text-slate-600 border-slate-300 hover:border-brand-green'
      )}
    >
      {label}
    </button>
  )
}

function RadioCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string
  description?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 rounded-xl border-2 transition-colors',
        selected
          ? 'border-brand-green bg-brand-green/5'
          : 'border-slate-200 hover:border-slate-300 bg-white'
      )}
    >
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </button>
  )
}

export default function QuizForm() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>(initial)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
    setError(null)
  }

  function toggleArray(key: 'preferred_locations' | 'sectors', value: string) {
    setData(prev => {
      const arr = prev[key]
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      }
    })
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!data.full_name.trim()) return 'Please enter your full name.'
      if (!data.email.trim() || !data.email.includes('@')) return 'Please enter a valid email.'
    }
    if (step === 2) {
      if (!data.investment_min) return 'Please enter your minimum budget.'
      if (!data.investment_max) return 'Please enter your maximum budget.'
      if (Number(data.investment_max) < Number(data.investment_min))
        return 'Maximum budget must be at least your minimum.'
    }
    if (step === 3) {
      if (!data.operator_model) return 'Please select an operator model.'
      if (!data.experience) return 'Please select your experience level.'
      if (!data.timeline_months) return 'Please select your timeline.'
    }
    if (step === 4) {
      if (data.preferred_locations.length === 0)
        return 'Please select at least one location.'
    }
    if (step === 5) {
      if (data.sectors.length === 0) return 'Please select at least one sector.'
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

  async function submit() {
    const err = validateStep()
    if (err) { setError(err); return }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          investment_min: data.investment_min ? Number(data.investment_min) : null,
          investment_max: data.investment_max ? Number(data.investment_max) : null,
          timeline_months: data.timeline_months ? Number(data.timeline_months) : null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      router.push(`/get-matched/results/${json.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Find your franchise match</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Answer a few questions and we&apos;ll show you brands that fit your goals.
        </p>
        {/* Progress bar */}
        <div className="mt-4 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">Step {step} of {TOTAL_STEPS}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

        {/* Step 1 — Contact */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800 mb-4">About you</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
              <input
                type="text"
                value={data.full_name}
                onChange={e => set('full_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                value={data.email}
                onChange={e => set('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={data.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="+44 7700 000000"
              />
            </div>
          </div>
        )}

        {/* Step 2 — Budget */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Investment budget</h2>
            <p className="text-sm text-slate-500 mb-4">
              This is the total amount you&apos;re able to invest, including any finance.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Minimum (£)</label>
              <input
                type="number"
                value={data.investment_min}
                onChange={e => set('investment_min', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="e.g. 20000"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Maximum (£)</label>
              <input
                type="number"
                value={data.investment_max}
                onChange={e => set('investment_max', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="e.g. 100000"
                min={0}
              />
            </div>
          </div>
        )}

        {/* Step 3 — Preferences */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Your preferences</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">How would you like to operate?</label>
              <div className="space-y-2">
                {[
                  { value: 'owner-operator', label: 'Owner-operator', description: 'Hands-on, day-to-day involvement' },
                  { value: 'hire-manager', label: 'Hire a manager', description: 'More hands-off, management role' },
                  { value: 'either', label: 'Either', description: 'Open to both models' },
                ].map(opt => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={data.operator_model === opt.value}
                    onClick={() => set('operator_model', opt.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Relevant experience</label>
              <div className="space-y-2">
                {[
                  { value: 'none', label: 'No prior experience' },
                  { value: 'management', label: 'Management experience' },
                  { value: 'food-beverage', label: 'Food & beverage experience' },
                ].map(opt => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    selected={data.experience === opt.value}
                    onClick={() => set('experience', opt.value)}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full-time commitment?</label>
                <div className="flex gap-2">
                  {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => set('full_time_available', v)}
                      className={cn(
                        'flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors',
                        data.full_time_available === v
                          ? 'border-brand-green bg-brand-green/5 text-brand-green'
                          : 'border-slate-200 text-slate-600'
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Multi-site growth?</label>
                <div className="flex gap-2">
                  {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => set('multi_site_interest', v)}
                      className={cn(
                        'flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors',
                        data.multi_site_interest === v
                          ? 'border-brand-green bg-brand-green/5 text-brand-green'
                          : 'border-slate-200 text-slate-600'
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Timeline to opening</label>
              <select
                value={data.timeline_months}
                onChange={e => set('timeline_months', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent bg-white"
              >
                <option value="">Select timeline…</option>
                <option value="3">Within 3 months</option>
                <option value="6">Within 6 months</option>
                <option value="12">Within 12 months</option>
                <option value="18">Within 18 months</option>
                <option value="24">Within 24 months</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 4 — Locations */}
        {step === 4 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-1">Preferred locations</h2>
            <p className="text-sm text-slate-500 mb-4">Select all areas you&apos;d consider.</p>
            <div className="flex flex-wrap gap-2">
              {UK_CITIES.map(city => (
                <TogglePill
                  key={city.value}
                  label={city.label}
                  active={data.preferred_locations.includes(city.value)}
                  onClick={() => toggleArray('preferred_locations', city.value)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 5 — Sectors */}
        {step === 5 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-1">Sectors of interest</h2>
            <p className="text-sm text-slate-500 mb-4">Select all sectors you&apos;d consider investing in.</p>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map(s => (
                <TogglePill
                  key={s.value}
                  label={s.label}
                  active={data.sectors.includes(s.value)}
                  onClick={() => toggleArray('sectors', s.value)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 6 — Background */}
        {step === 6 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-1">Your background</h2>
            <p className="text-sm text-slate-500 mb-4">
              Briefly tell us about your goals and any relevant background. This helps us refine your matches.
            </p>
            <textarea
              value={data.goals}
              onChange={e => set('goals', e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
              placeholder="e.g. I've managed teams in hospitality for 8 years and I'm looking to invest in a food concept in Manchester…"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={back}
              className="flex-1 border border-slate-300 text-slate-700 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex-1 bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting ? 'Finding your matches…' : 'See my matches'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
