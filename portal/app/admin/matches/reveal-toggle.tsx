'use client'

import { useState } from 'react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

/**
 * Reveal-gating: controls whether the franchisor can see this candidate match
 * (matches.franchisor_revealed). Off by default — the admin decides when a brand
 * sees a candidate.
 */
export default function RevealToggle({ matchId, revealed }: { matchId: string; revealed: boolean }) {
  const [on, setOn] = useState(revealed)
  const [saving, setSaving] = useState(false)

  async function toggle() {
    const next = !on
    setOn(next)
    setSaving(true)
    await fetch(`/api/admin/matches/${matchId}/reveal`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revealed: next }),
    }).catch(() => {})
    setSaving(false)
    toast(next ? 'Revealed — brand notified' : 'Hidden from brand')
  }

  return (
    <button onClick={toggle} disabled={saving}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-60',
        on ? 'bg-ff-green/10 text-ff-green border-ff-green/30' : 'text-ink-2 border-line bg-surface hover:bg-surface-2',
      )}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {on
          ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></>
          : <><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.45 18.45 0 0 0 1 12s4 8 11 8a9.12 9.12 0 0 0 5.39-1.61" /><path d="m1 1 22 22" /></>}
      </svg>
      {on ? 'Revealed to brand' : 'Reveal to brand'}
    </button>
  )
}
