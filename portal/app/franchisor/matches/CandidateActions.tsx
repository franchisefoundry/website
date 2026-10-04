'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'

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
      toast(action === 'interested' ? 'Interest noted — your consultant will be in touch' : 'Candidate passed')
      router.refresh()
    } else {
      toast('Something went wrong. Please try again.', 'error')
    }
    setLoading(null)
  }

  if (currentStatus === 'declined') {
    return (
      <p className="text-xs text-ink-3 flex items-center gap-1.5">
        <span>✗</span> You passed on this candidate
      </p>
    )
  }

  if (currentStatus === 'interested') {
    return (
      <p className="text-xs text-ff-green font-medium flex items-center gap-1.5">
        <span>✓</span> You expressed interest — your consultant will be in touch
      </p>
    )
  }

  if (done) return null

  return (
    <div className="flex items-center gap-2">
      <p className="text-xs text-ink-3 mr-1">Is this candidate a good fit?</p>
      <button
        onClick={() => respond('interested')}
        disabled={loading !== null}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-ff-green hover:bg-ff-green-deep rounded-lg transition-colors disabled:opacity-60"
      >
        {loading === 'interested' ? '…' : '👍 Interested'}
      </button>
      <button
        onClick={() => respond('pass')}
        disabled={loading !== null}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-2 bg-surface-2 hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-60"
      >
        {loading === 'pass' ? '…' : 'Pass'}
      </button>
    </div>
  )
}
