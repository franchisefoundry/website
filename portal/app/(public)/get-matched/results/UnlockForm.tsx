'use client'

import { useState } from 'react'

interface QuizData {
  bmin: number | null
  bmax: number | null
  liquid_capital: number | null
  operator_model: string | null
  experience: string | null
  full_time_available: boolean
  multi_site_interest: boolean
  timeline_months: number | null
  format_types: string[]
  preferred_locations: string[]
  other_location: string
  goals: string
}

export default function UnlockForm({ quizData, matchCount }: { quizData: QuizData; matchCount: number }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' })
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function set(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    setError(null)
  }

  async function handleSubmit() {
    if (!form.full_name.trim()) { setError('Please enter your full name.'); return }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Please enter a valid email address.'); return }
    if (!form.phone.trim()) { setError('Please enter your phone number.'); return }
    if (!terms) { setError('Please agree to the Terms of Engagement to continue.'); return }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          investment_min: quizData.bmin,
          investment_max: quizData.bmax,
          liquid_capital: quizData.liquid_capital,
          operator_model: quizData.operator_model,
          experience: quizData.experience,
          full_time_available: quizData.full_time_available,
          multi_site_interest: quizData.multi_site_interest,
          timeline_months: quizData.timeline_months,
          format_types: quizData.format_types,
          preferred_locations: quizData.preferred_locations,
          sectors: ['food-beverage'],
          goals: [quizData.goals, quizData.other_location ? `Preferred area: ${quizData.other_location}` : ''].filter(Boolean).join('\n\n'),
          status: 'meeting_requested',
        }),
      })

      const text = await res.text()
      let json: { error?: string; id?: string } = {}
      try { json = JSON.parse(text) } catch { /* not json */ }

      if (!res.ok) { setError(json.error ?? `Something went wrong (${res.status}).`); setLoading(false); return }
      setDone(true)
    } catch (err) {
      setError(`Request failed: ${err instanceof Error ? err.message : 'Please try again.'}`)
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '40px 32px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(200,146,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.5rem' }}>
            ✓
          </div>
          <h3 style={{ color: '#f0d4a8', fontWeight: 700, fontSize: '1.4rem', marginBottom: 12 }}>Request received!</h3>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
            We&apos;ll review your matches and be in touch within 1 working day to arrange your free consultation call.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 52 }}>
      <h3 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 700, color: 'white', marginBottom: 12, letterSpacing: '-0.02em' }}>
        Unlock your full match details
      </h3>
      <p style={{ textAlign: 'center', fontSize: '0.95rem', color: 'rgba(255,255,255,0.65)', marginBottom: 36, lineHeight: 1.7 }}>
        {matchCount > 0
          ? `We've identified ${matchCount} brand${matchCount === 1 ? '' : 's'} that fit your profile. Enter your details and our team will be in touch within 1 working day to walk through your matches, reveal the brand names, and answer your questions.`
          : "Enter your details and our team will be in touch within 1 working day — we'll keep you updated as new brands join our network."}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { key: 'full_name' as const, label: 'Full Name', type: 'text', placeholder: 'Jane Smith', required: true },
          { key: 'email' as const, label: 'Email Address', type: 'email', placeholder: 'jane@example.com', required: true },
          { key: 'phone' as const, label: 'Mobile Number', type: 'tel', placeholder: '+44 7700 000000', required: true },
        ].map(field => (
          <div key={field.key}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              {field.label} {field.required && <span style={{ color: '#c8924a' }}>*</span>}
            </label>
            <input
              type={field.type}
              value={form[field.key]}
              onChange={e => set(field.key, e.target.value)}
              placeholder={field.placeholder}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '12px 16px',
                fontSize: '1rem', color: 'white',
                fontFamily: "'Sora', sans-serif",
                outline: 'none',
              }}
            />
          </div>
        ))}

        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="checkbox" checked={terms} onChange={e => { setTerms(e.target.checked); setError(null) }}
            style={{ marginTop: 3, flexShrink: 0, accentColor: '#c8924a' }} />
          <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            I agree to the <a href="https://franchisefoundry.co.uk/terms.html" target="_blank" rel="noreferrer" style={{ color: '#f0d4a8', textDecoration: 'underline' }}>Franchise Foundry Terms of Engagement</a> and <a href="https://franchisefoundry.co.uk/privacy.html" target="_blank" rel="noreferrer" style={{ color: '#f0d4a8', textDecoration: 'underline' }}>Privacy Policy</a>. I understand that any franchise introductions made by Franchise Foundry are made in a brokerage capacity, and I agree not to approach any introduced brand directly without Franchise Foundry&apos;s involvement.
          </span>
        </label>

        {/* GDPR data processing notice — required under UK GDPR Article 13 */}
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: 0, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
          <strong style={{ color: 'rgba(255,255,255,0.5)' }}>How we use your data:</strong> Franchise Foundry (the data controller) will use the information you provide to match you with franchise opportunities and to contact you about your enquiry. We will not sell your personal data to third parties. You have the right to access, correct, or delete your data at any time by emailing{' '}
          <a href="mailto:hello@franchisefoundry.co.uk" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>hello@franchisefoundry.co.uk</a>.
          For full details see our <a href="https://franchisefoundry.co.uk/privacy.html" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>Privacy Policy</a>.
        </p>

        {error && (
          <p style={{ fontSize: '0.85rem', color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
            {error}
          </p>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{
            width: '100%', background: '#c8924a', color: 'white',
            padding: '16px 32px', border: 'none', borderRadius: 8,
            fontWeight: 700, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Sora', sans-serif", opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {loading ? 'Submitting…' : <>Unlock My Matches <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          Your details are secure and never shared with third parties.
        </p>
      </div>
    </div>
  )
}
