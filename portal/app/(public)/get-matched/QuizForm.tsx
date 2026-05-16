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

const STEP_LABELS = ['About you', 'Budget', 'Preferences', 'Location', 'Sectors', 'Background']

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
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
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
      if (Number(data.investment_max) < Number(data.investment_min)) return 'Maximum must be at least your minimum.'
    }
    if (step === 3) {
      if (!data.operator_model) return 'Please select an operator model.'
      if (!data.experience) return 'Please select your experience level.'
      if (!data.timeline_months) return 'Please select your timeline.'
    }
    if (step === 4 && data.preferred_locations.length === 0) return 'Please select at least one location.'
    if (step === 5 && data.sectors.length === 0) return 'Please select at least one sector.'
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
      const text = await res.text()
      let json: { error?: string; id?: string } = {}
      try { json = JSON.parse(text) } catch { /* not JSON */ }
      if (!res.ok) { setError(json.error ?? `Error (${res.status})`); setSubmitting(false); return }
      if (!json.id) { setError('No ID returned. Please try again.'); setSubmitting(false); return }
      router.push(`/get-matched/results/${json.id}`)
    } catch (err) {
      setError(`Request failed: ${err instanceof Error ? err.message : String(err)}`)
      setSubmitting(false)
    }
  }

  // ── Loading overlay ──────────────────────────────────────────────────────────
  if (submitting) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      }}>
        <style>{`
          @keyframes ffRingSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes ffLogoPulse {
            0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
            50% { transform: translate(-50%,-50%) scale(1.10); opacity: 0.88; }
          }
          @keyframes ffDotFade { 0%,80%,100% { opacity: 0; } 40% { opacity: 1; } }
          @keyframes ffProgress { from { width: 0%; } to { width: 100%; } }
          .ff-dot { display: inline-block; opacity: 0; animation: ffDotFade 1.5s infinite both; }
          .ff-dot:nth-child(2) { animation-delay: 0.2s; }
          .ff-dot:nth-child(3) { animation-delay: 0.4s; }
        `}</style>
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ position: 'relative', width: 220, height: 220, margin: '0 auto 36px' }}>
            <svg
              viewBox="0 0 140 140"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', animation: 'ffRingSpin 1.9s linear infinite', transformOrigin: 'center' }}
            >
              <circle cx="70" cy="70" r="62" fill="none" stroke="#c8924a" strokeWidth="5" strokeDasharray="95 294" strokeLinecap="round" />
              <circle cx="70" cy="70" r="62" fill="none" stroke="#c8924a" strokeWidth="5" strokeDasharray="20 369" strokeDashoffset="-130" strokeLinecap="round" opacity="0.35" />
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon-icon.png"
              alt="Franchise Foundry"
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 148, height: 148, objectFit: 'contain',
                animation: 'ffLogoPulse 2.2s ease-in-out infinite',
              }}
            />
          </div>
          <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.45rem', fontWeight: 600, color: '#5f725f', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
            Getting your matches<span><span className="ff-dot">.</span><span className="ff-dot">.</span><span className="ff-dot">.</span></span>
          </p>
          <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '0.92rem', color: '#aaa', margin: 0 }}>
            Finding the best franchise opportunities for you
          </p>
        </div>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, height: 4,
          background: 'linear-gradient(90deg, #5f725f, #c8924a)',
          borderRadius: '0 2px 2px 0',
          animation: 'ffProgress 5s ease-out forwards',
        }} />
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .quiz-tile { cursor: pointer; transition: all 0.2s; }
        .quiz-tile:hover { border-color: #5f725f !important; background: rgba(90,110,90,0.04) !important; }
        .quiz-tile.selected { border-color: #c8924a !important; background: rgba(200,146,74,0.07) !important; box-shadow: 0 0 0 3px rgba(200,146,74,0.12) !important; }
        .quiz-tile.selected .tile-main-text { color: #c8924a !important; }
        .quiz-field input, .quiz-field textarea, .quiz-field select {
          width: 100%; border: none; border-bottom: 1.5px solid #e2e8e2;
          padding: 10px 0; font-size: 1rem; font-family: 'Sora', sans-serif;
          color: #161a16; background: transparent; transition: border-color 0.2s; box-sizing: border-box;
        }
        .quiz-field input:focus, .quiz-field textarea:focus, .quiz-field select:focus {
          outline: none; border-bottom-color: #3a4a3a;
        }
        .quiz-field input::placeholder, .quiz-field textarea::placeholder { color: rgba(0,0,0,0.22); font-weight: 300; }
        .pill-toggle { cursor: pointer; transition: all 0.2s; padding: 8px 16px; border-radius: 100px; font-size: 0.84rem; font-weight: 600; border: 1.5px solid #e2e8e2; color: #4a5568; background: white; }
        .pill-toggle.active { background: #3a4a3a; border-color: #3a4a3a; color: white; }
        .pill-toggle:hover:not(.active) { border-color: #5f725f; }
      `}</style>

      {/* Hero */}
      <div style={{ background: 'white', borderBottom: '1px solid #e8ede8', padding: '64px 40px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#eef3ee', border: '1px solid #d4e0d4',
            color: '#5f725f', fontSize: '0.78rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '7px 16px', borderRadius: 100, marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, background: '#5f725f', borderRadius: '50%', display: 'inline-block' }} />
            Free matching service
          </div>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#111827', marginBottom: 20, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Find your franchise match
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#4b5563', fontWeight: 300, lineHeight: 1.75 }}>
            Answer a few questions and we&apos;ll match you with franchise brands that fit your goals, budget and lifestyle.
          </p>
        </div>
      </div>

      {/* Form section */}
      <div style={{ padding: '48px 40px 100px', background: '#3a4a3a', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 380, height: 380, background: 'radial-gradient(circle, rgba(95,114,95,0.22) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'white', letterSpacing: '-0.03em', marginBottom: 10 }}>
            Tell us about yourself
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', fontWeight: 300 }}>
            Takes about 2 minutes — we&apos;ll show your matches instantly.
          </p>
        </div>

        <div style={{ maxWidth: 700, margin: '0 auto', background: 'white', borderRadius: 32, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>

          {/* Progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '28px 40px 0' }}>
            {STEP_LABELS.map((label, i) => {
              const num = i + 1
              const done = num < step
              const active = num === step
              return (
                <div key={num} style={{ display: 'flex', alignItems: 'center', flex: num < TOTAL_STEPS ? 1 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
                      background: done ? '#c8924a' : active ? '#3a4a3a' : 'white',
                      border: done ? '2px solid #c8924a' : active ? '2px solid #3a4a3a' : '2px solid #e2e8e2',
                      color: done || active ? 'white' : '#7a8990',
                    }}>
                      {done ? '✓' : num}
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? '#3a4a3a' : '#7a8990', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  </div>
                  {num < TOTAL_STEPS && (
                    <div style={{ flex: 1, height: 2, background: done ? '#c8924a' : '#e2e8e2', margin: '0 8px', marginBottom: 20, transition: 'background 0.3s' }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Steps */}
          <div style={{ padding: '32px 40px 40px' }}>

            {/* Step 1 — Contact */}
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#161a16', marginBottom: 6, letterSpacing: '-0.02em' }}>About you</h2>
                <p style={{ fontSize: '0.92rem', color: '#4a5568', fontWeight: 300, marginBottom: 32 }}>We&apos;ll use this to send your personalised match report.</p>
                <div className="quiz-field" style={{ marginBottom: 28 }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4a5568', marginBottom: 8 }}>Full name *</label>
                  <input type="text" value={data.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jane Smith" autoComplete="name" />
                </div>
                <div className="quiz-field" style={{ marginBottom: 28 }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4a5568', marginBottom: 8 }}>Email address *</label>
                  <input type="email" value={data.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" autoComplete="email" />
                </div>
                <div className="quiz-field">
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4a5568', marginBottom: 8 }}>Phone <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                  <input type="tel" value={data.phone} onChange={e => set('phone', e.target.value)} placeholder="+44 7700 000000" autoComplete="tel" />
                </div>
              </div>
            )}

            {/* Step 2 — Budget */}
            {step === 2 && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#161a16', marginBottom: 6, letterSpacing: '-0.02em' }}>Investment budget</h2>
                <p style={{ fontSize: '0.92rem', color: '#4a5568', fontWeight: 300, marginBottom: 32 }}>Total you&apos;re able to invest, including any finance or funding.</p>
                <div className="quiz-field" style={{ marginBottom: 28 }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4a5568', marginBottom: 8 }}>Minimum (£) *</label>
                  <input type="number" value={data.investment_min} onChange={e => set('investment_min', e.target.value)} placeholder="e.g. 50000" min={0} />
                </div>
                <div className="quiz-field">
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4a5568', marginBottom: 8 }}>Maximum (£) *</label>
                  <input type="number" value={data.investment_max} onChange={e => set('investment_max', e.target.value)} placeholder="e.g. 300000" min={0} />
                </div>
              </div>
            )}

            {/* Step 3 — Preferences */}
            {step === 3 && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#161a16', marginBottom: 6, letterSpacing: '-0.02em' }}>Your preferences</h2>
                <p style={{ fontSize: '0.92rem', color: '#4a5568', fontWeight: 300, marginBottom: 32 }}>Help us understand how you want to operate.</p>

                <p style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', marginBottom: 12 }}>How would you like to operate?</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
                  {[
                    { value: 'owner-operator', main: 'Owner-operator', sub: 'Hands-on, day-to-day' },
                    { value: 'hire-manager', main: 'Hire a manager', sub: 'Semi-passive model' },
                    { value: 'either', main: 'Either', sub: 'Open to both' },
                  ].map(opt => (
                    <button key={opt.value} type="button" className={`quiz-tile${data.operator_model === opt.value ? ' selected' : ''}`}
                      onClick={() => set('operator_model', opt.value)}
                      style={{ padding: '14px 8px', border: '1.5px solid #e2e8e2', borderRadius: 16, textAlign: 'center', background: 'white' }}>
                      <div className="tile-main-text" style={{ fontSize: '0.84rem', fontWeight: 700, color: '#161a16', lineHeight: 1.2 }}>{opt.main}</div>
                      <div style={{ fontSize: '0.7rem', color: '#7a8990', fontWeight: 400, marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', marginBottom: 12 }}>Experience level</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
                  {[
                    { value: 'none', main: 'No experience', sub: 'First-time investor' },
                    { value: 'management', main: 'Management', sub: 'Team leadership' },
                    { value: 'food-beverage', main: 'F&B / hospitality', sub: 'Industry background' },
                  ].map(opt => (
                    <button key={opt.value} type="button" className={`quiz-tile${data.experience === opt.value ? ' selected' : ''}`}
                      onClick={() => set('experience', opt.value)}
                      style={{ padding: '14px 8px', border: '1.5px solid #e2e8e2', borderRadius: 16, textAlign: 'center', background: 'white' }}>
                      <div className="tile-main-text" style={{ fontSize: '0.84rem', fontWeight: 700, color: '#161a16', lineHeight: 1.2 }}>{opt.main}</div>
                      <div style={{ fontSize: '0.7rem', color: '#7a8990', fontWeight: 400, marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
                  <div>
                    <p style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', marginBottom: 12 }}>Full-time commitment?</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[{ v: true, l: 'Yes' }, { v: false, l: 'No / Part-time' }].map(({ v, l }) => (
                        <button key={l} type="button" className={`quiz-tile${data.full_time_available === v ? ' selected' : ''}`}
                          onClick={() => set('full_time_available', v)}
                          style={{ padding: '12px 8px', border: '1.5px solid #e2e8e2', borderRadius: 12, textAlign: 'center', background: 'white' }}>
                          <div className="tile-main-text" style={{ fontSize: '0.84rem', fontWeight: 700, color: '#161a16' }}>{l}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', marginBottom: 12 }}>Multi-site ambition?</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[{ v: true, l: 'Yes' }, { v: false, l: 'Single site' }].map(({ v, l }) => (
                        <button key={l} type="button" className={`quiz-tile${data.multi_site_interest === v ? ' selected' : ''}`}
                          onClick={() => set('multi_site_interest', v)}
                          style={{ padding: '12px 8px', border: '1.5px solid #e2e8e2', borderRadius: 12, textAlign: 'center', background: 'white' }}>
                          <div className="tile-main-text" style={{ fontSize: '0.84rem', fontWeight: 700, color: '#161a16' }}>{l}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', marginBottom: 12 }}>Timeline to opening *</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                  {[{ v: '3', main: '3 months', sub: 'ASAP' }, { v: '6', main: '6 months', sub: 'Near-term' }, { v: '12', main: '1 year', sub: 'Planning' }, { v: '18', main: '18 months', sub: 'Medium-term' }, { v: '24', main: '2 years', sub: 'Long-term' }].map(opt => (
                    <button key={opt.v} type="button" className={`quiz-tile${data.timeline_months === opt.v ? ' selected' : ''}`}
                      onClick={() => set('timeline_months', opt.v)}
                      style={{ padding: '14px 8px', border: '1.5px solid #e2e8e2', borderRadius: 16, textAlign: 'center', background: 'white' }}>
                      <div className="tile-main-text" style={{ fontSize: '0.84rem', fontWeight: 700, color: '#161a16', lineHeight: 1.2 }}>{opt.main}</div>
                      <div style={{ fontSize: '0.7rem', color: '#7a8990', fontWeight: 400, marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4 — Locations */}
            {step === 4 && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#161a16', marginBottom: 6, letterSpacing: '-0.02em' }}>Preferred locations</h2>
                <p style={{ fontSize: '0.92rem', color: '#4a5568', fontWeight: 300, marginBottom: 28 }}>Select all areas you&apos;d consider opening in.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {UK_CITIES.map(city => (
                    <button key={city.value} type="button"
                      className={`pill-toggle${data.preferred_locations.includes(city.value) ? ' active' : ''}`}
                      onClick={() => toggleArray('preferred_locations', city.value)}>
                      {city.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5 — Sectors */}
            {step === 5 && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#161a16', marginBottom: 6, letterSpacing: '-0.02em' }}>Sectors of interest</h2>
                <p style={{ fontSize: '0.92rem', color: '#4a5568', fontWeight: 300, marginBottom: 28 }}>Select all sectors you&apos;d consider investing in.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SECTORS.map(s => (
                    <button key={s.value} type="button"
                      className={`pill-toggle${data.sectors.includes(s.value) ? ' active' : ''}`}
                      onClick={() => toggleArray('sectors', s.value)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6 — Background */}
            {step === 6 && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#161a16', marginBottom: 6, letterSpacing: '-0.02em' }}>Your background</h2>
                <p style={{ fontSize: '0.92rem', color: '#4a5568', fontWeight: 300, marginBottom: 28 }}>
                  Tell us briefly about your goals and background — this helps us find your best-fit brands.
                </p>
                <div className="quiz-field">
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4a5568', marginBottom: 8 }}>Goals &amp; background</label>
                  <textarea value={data.goals} onChange={e => set('goals', e.target.value)} rows={5}
                    placeholder="e.g. I've managed teams in hospitality for 8 years and I'm looking to invest in a food concept in Manchester…" />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p style={{ marginTop: 16, fontSize: '0.875rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
                {error}
              </p>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 36 }}>
              {step > 1 ? (
                <button type="button" onClick={back}
                  style={{ background: 'none', border: 'none', fontFamily: "'Sora', sans-serif", fontSize: '0.88rem', fontWeight: 600, color: '#7a8990', cursor: 'pointer', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ← Back
                </button>
              ) : <div />}

              {step < TOTAL_STEPS ? (
                <button type="button" onClick={next}
                  style={{ background: '#c8924a', color: 'white', padding: '14px 32px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}>
                  Continue →
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={submitting}
                  style={{ background: '#c8924a', color: 'white', padding: '14px 32px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: "'Sora', sans-serif", opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? 'Finding your matches…' : 'See my matches →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
