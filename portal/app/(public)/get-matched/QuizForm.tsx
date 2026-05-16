'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { UK_CITIES } from '@/lib/supabase/types'

const TOTAL_STEPS = 3
const STEP_LABELS = ['Investment', 'Your Vision', 'About You']

const BUDGET_MAX = 1_500_000
const BUDGET_STEP = 10_000

function formatBudget(v: number, isMax = false): string {
  if (isMax && v >= BUDGET_MAX) return '£1.5m+'
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1).replace('.0', '')}m`
  if (v === 0) return '£0'
  return `£${v / 1_000}k`
}

const TIMELINES = [
  { value: '3',  label: 'Now',          sub: 'Ready to go' },
  { value: '3',  label: '1–3 months',   sub: 'Very soon' },
  { value: '6',  label: '3–6 months',   sub: 'Exploring' },
  { value: '12', label: '6–12 months',  sub: 'Planning ahead' },
  { value: '24', label: '12+ months',   sub: 'Future goal' },
]

type FormData = {
  budget_min: number
  budget_max: number
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
  budget_min: 50_000,
  budget_max: 300_000,
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
  const [loading, setLoading] = useState(false)
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
      if (data.budget_min >= data.budget_max) return 'Please set a valid budget range — min must be less than max.'
      if (!data.timeline_months) return 'Please select your timeline.'
    }
    if (step === 2) {
      if (!data.operator_model) return 'Please select how you plan to run the business.'
    }
    if (step === 3) {
      if (!data.experience) return 'Please select your business background.'
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

    setLoading(true)

    const params = new URLSearchParams()
    params.set('bmin', String(data.budget_min))
    params.set('bmax', String(data.budget_max))
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

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#2a352a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, gap: 24, fontFamily: "'Sora', system-ui, sans-serif" }}>
        <style>{`
          @keyframes ffBreath { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.8} }
          @keyframes ffDots { 0%,20%{opacity:0.2} 40%{opacity:1} 100%{opacity:0.2} }
        `}</style>
        <Image src="/favicon-icon.png" alt="Franchise Foundry" width={72} height={72}
          style={{ animation: 'ffBreath 1.8s ease-in-out infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>
            Scoring your matches
          </p>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
            {[0, 0.3, 0.6].map((delay, i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(200,146,74,0.8)', display: 'inline-block', animation: `ffDots 1.4s ease-in-out ${delay}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Full-width white hero — matches website find-match.html */}
      <section style={{ background: 'white', borderBottom: '1px solid #e8ede8', padding: '80px 40px 56px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#eef3ee', border: '1px solid #d4e0d4',
            color: '#5f725f', fontSize: '0.78rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '7px 16px', borderRadius: 100, marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, background: '#5f725f', borderRadius: '50%', display: 'inline-block' }} />
            Matching Platform
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: '#111827', marginBottom: 20, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Find Your Match
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#4b5563', fontWeight: 300, lineHeight: 1.75, maxWidth: 620, margin: '0 auto' }}>
            Our matching engine scores your profile against every hospitality brand in our network — investment level, how you want to operate, your background, your ambitions. No broker gut feel. No bias toward any particular brand. Just fit. Fill in the form below — it takes about two minutes — and we&apos;ll arrange a call to run through exactly what you&apos;ve been matched with.
          </p>
        </div>
      </section>

      {/* Full-width dark green form section */}
      <section style={{ padding: '56px 40px 100px', background: '#3a4a3a' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'white', letterSpacing: '-0.03em', marginBottom: 10, lineHeight: 1.15 }}>
            Get Your Free Franchise Matches
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', fontWeight: 300 }}>
            Takes 2 minutes &nbsp;·&nbsp; No obligation &nbsp;·&nbsp; Completely free
          </p>
        </div>

        {/* White form card */}
        <div style={{ maxWidth: 680, margin: '0 auto', background: 'white', borderRadius: 32, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
          <div className="p-8">

            {/* Progress steps */}
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

            {/* Step 1 — Investment */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Let&apos;s find your match</h3>
                  <p className="text-sm text-slate-500">Tell us about your investment budget and timeline.</p>
                </div>

                {/* Budget sliders — £10k increments */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Investment Budget</p>
                  <div className="text-center mb-5">
                    <span className="text-2xl font-bold text-brand-green">
                      {formatBudget(data.budget_min)} – {formatBudget(data.budget_max, true)}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span>Minimum</span>
                        <span className="font-semibold text-slate-600">{formatBudget(data.budget_min)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={BUDGET_MAX - BUDGET_STEP}
                        step={BUDGET_STEP}
                        value={data.budget_min}
                        onChange={e => {
                          const v = Number(e.target.value)
                          setData(prev => ({
                            ...prev,
                            budget_min: v,
                            budget_max: v >= prev.budget_max ? v + BUDGET_STEP : prev.budget_max,
                          }))
                          setError(null)
                        }}
                        className="w-full accent-brand-green cursor-pointer"
                        style={{ height: 6 }}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span>Maximum</span>
                        <span className="font-semibold text-slate-600">{formatBudget(data.budget_max, true)}</span>
                      </div>
                      <input
                        type="range"
                        min={BUDGET_STEP}
                        max={BUDGET_MAX}
                        step={BUDGET_STEP}
                        value={data.budget_max}
                        onChange={e => {
                          const v = Number(e.target.value)
                          setData(prev => ({
                            ...prev,
                            budget_max: v,
                            budget_min: v <= prev.budget_min ? Math.max(0, v - BUDGET_STEP) : prev.budget_min,
                          }))
                          setError(null)
                        }}
                        className="w-full accent-brand-green cursor-pointer"
                        style={{ height: 6 }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300 mt-2">
                    <span>£0</span><span>£375k</span><span>£750k</span><span>£1.1m</span><span>£1.5m+</span>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">When do you want to start?</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TIMELINES.map(t => (
                      <Tile key={t.label} label={t.label} sub={t.sub}
                        selected={data.timelineLabel === t.label}
                        onClick={() => {
                          setData(prev => ({ ...prev, timelineLabel: t.label, timeline_months: t.value }))
                          setError(null)
                        }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Your Vision */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Your Vision</h3>
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
                    <div className="space-y-2">
                      {[{ v: true, l: 'Yes' }, { v: false, l: 'No / part-time' }].map(({ v, l }) => (
                        <RadioCard key={l} label={l} selected={data.full_time_available === v}
                          onClick={() => set('full_time_available', v)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Multi-site ambition?</p>
                    <div className="space-y-2">
                      {[{ v: true, l: 'Yes, I want to grow' }, { v: false, l: 'Single site for now' }].map(({ v, l }) => (
                        <RadioCard key={l} label={l} selected={data.multi_site_interest === v}
                          onClick={() => set('multi_site_interest', v)} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — About You */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">About You</h3>
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
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Anything else we should know? <span className="normal-case font-normal text-slate-400">(optional)</span>
                  </p>
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
        </div>
      </section>
    </>
  )
}
