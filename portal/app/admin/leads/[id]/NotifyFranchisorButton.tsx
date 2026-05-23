'use client'

import { useState } from 'react'

export default function NotifyFranchisorButton({
  leadId,
  franchisorId,
  brandName,
}: {
  leadId: string
  franchisorId: string
  brandName: string
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  async function handleNotify() {
    if (status === 'sent') return
    setStatus('loading')
    try {
      const res = await fetch('/api/admin/notify-franchisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, franchisorId }),
      })
      if (res.ok) {
        setStatus('sent')
      } else {
        const { error } = await res.json()
        console.error('Notify error:', error)
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Notified
      </span>
    )
  }

  if (status === 'error') {
    return (
      <button
        onClick={handleNotify}
        className="text-xs text-red-500 font-medium hover:underline"
      >
        Failed — retry?
      </button>
    )
  }

  return (
    <button
      onClick={handleNotify}
      disabled={status === 'loading'}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-green/10 text-brand-green hover:bg-brand-green/20 transition-colors disabled:opacity-50"
      title={`Email ${brandName} about this match`}
    >
      {status === 'loading' ? (
        <>
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" strokeOpacity=".75"/></svg>
          Sending…
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Notify franchisor
        </>
      )}
    </button>
  )
}
