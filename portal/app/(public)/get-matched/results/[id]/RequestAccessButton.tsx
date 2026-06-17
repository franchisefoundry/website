'use client'

import { useState } from 'react'

export default function RequestAccessButton({
  leadId,
  alreadyRequested,
}: {
  leadId: string
  alreadyRequested: boolean
}) {
  const [requested, setRequested] = useState(alreadyRequested)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRequest() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${leadId}/request-access`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong.')
      } else {
        setRequested(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (requested) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '20px 24px', marginBottom: 8 }}>
        <p style={{ color: '#f0d4a8', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>✓ Request received</p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
          We&apos;ll be in touch within 1 working day to arrange your free consultation call.
        </p>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleRequest}
        disabled={loading}
        style={{
          width: '100%',
          background: '#c8924a',
          color: 'white',
          padding: '16px 32px',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: '1rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "var(--font-sora), sans-serif",
          opacity: loading ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        {loading ? 'Requesting…' : (
          <>
            Unlock My Matches
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </>
        )}
      </button>
      {error && <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: 8 }}>{error}</p>}
    </>
  )
}
