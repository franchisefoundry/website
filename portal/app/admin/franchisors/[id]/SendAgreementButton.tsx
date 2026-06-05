'use client'

import { useState } from 'react'

export default function SendAgreementButton({
  franchisorProfileId,
  currentStatus,
}: {
  franchisorProfileId: string
  currentStatus: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(currentStatus)

  async function handleSend() {
    if (status === 'signed') return
    const label = status === 'sent' ? 'resend the agreement' : 'send the agreement for signature'
    if (!confirm(`Are you sure you want to ${label}?`)) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/agreements/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ franchisorProfileId }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d.error ?? 'Failed'); return }
      setStatus('sent')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'signed') {
    return (
      <span className="text-sm text-emerald-600 font-medium border border-emerald-200 bg-emerald-50 px-4 py-2 rounded-lg">
        ✓ Agreement signed
      </span>
    )
  }

  return (
    <button
      onClick={handleSend}
      disabled={loading}
      className="text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
    >
      {loading ? 'Sending…' : status === 'sent' ? 'Resend agreement' : 'Send agreement'}
    </button>
  )
}
