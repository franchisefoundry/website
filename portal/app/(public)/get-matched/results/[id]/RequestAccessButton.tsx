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
      <div className="bg-white/20 rounded-xl px-4 py-3">
        <p className="text-white font-medium text-sm">✓ Request received</p>
        <p className="text-white/80 text-xs mt-0.5">
          We&apos;ll be in touch within 1 working day to arrange your call.
        </p>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleRequest}
        disabled={loading}
        className="w-full bg-white text-brand-green font-semibold py-3 px-6 rounded-xl text-sm hover:bg-white/90 transition-colors disabled:opacity-70"
      >
        {loading ? 'Requesting…' : 'Book a free call to unlock my matches'}
      </button>
      {error && <p className="text-red-200 text-xs mt-2">{error}</p>}
    </>
  )
}
