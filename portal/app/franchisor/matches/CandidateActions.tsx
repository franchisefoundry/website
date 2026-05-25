'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  matchId: string
  currentStatus: string
}

export function CandidateActions({ matchId, currentStatus }: Props) {
  const [loading, setLoading] = useState<'interested' | 'pass' | null>(null)
  const [done, setDone] = useState(currentStatus === 'interested' || currentStatus === 'declined')
  const router = useRouter()

  async function respond(action: 'interested' | 'pass') {
    setLoading(action)
    const res = await fetch(`/api/franchisor/matches/${matchId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      setDone(true)
      router.refresh()
    }
    setLoading(null)
  }

  if (currentStatus === 'declined') {
    return (
      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <span>✗</span> You passed on this candidate
      </p>
    )
  }

  if (currentStatus === 'interested') {
    return (
      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
        <span>✓</span> You expressed interest — your consultant will be in touch
      </p>
    )
  }

  if (done) return null

  return (
    <div className="flex items-center gap-2">
      <p className="text-xs text-slate-500 mr-1">Is this candidate a good fit?</p>
      <button
        onClick={() => respond('interested')}
        disabled={loading !== null}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-green hover:bg-brand-green-dark rounded-lg transition-colors disabled:opacity-60"
      >
        {loading === 'interested' ? '…' : '👍 Interested'}
      </button>
      <button
        onClick={() => respond('pass')}
        disabled={loading !== null}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-60"
      >
        {loading === 'pass' ? '…' : 'Pass'}
      </button>
    </div>
  )
}
