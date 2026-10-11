'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

/** "Add to outreach list" on an unanswered search; click again to tick it off. */
export function OutreachButton({ query, need, area, searches, demo, initial }: {
  query: string; need: string | null; area: string | null; searches: number; demo: boolean; initial: 'todo' | 'done' | null
}) {
  const [state, setState] = useState(initial)
  const [busy, setBusy] = useState(false)
  async function click() {
    setBusy(true)
    const res = await fetch('/api/admin/foundry/outreach', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, need, area, searches, demo }),
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) { toast(data?.error ?? 'Something went wrong.', 'error'); return }
    setState(data.status)
  }
  return (
    <button type="button" disabled={busy} onClick={click} aria-pressed={!!state}
      className={cn('min-h-[36px] rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-60',
        state === 'todo' ? 'border-ff-green bg-ff-green text-white' : state === 'done' ? 'border-line text-ink-3 line-through' : 'border-line text-ink hover:bg-surface-2')}>
      {state === 'todo' ? 'On outreach list ✓' : state === 'done' ? 'Recruited' : 'Add to outreach list'}
    </button>
  )
}
