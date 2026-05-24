'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  matchId: string
  currentStatus: string
}

const STATUSES = ['suggested', 'shown', 'interested', 'intro_made', 'declined']

export default function MatchStatusSelect({ matchId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    setStatus(next)          // instant visual update
    setSaving(true)
    const supabase = createClient()
    await supabase.from('matches').update({ status: next }).eq('id', matchId)
    setSaving(false)
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={saving}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-green bg-white disabled:opacity-60"
    >
      {STATUSES.map(s => (
        <option key={s} value={s}>{s.replace('_', ' ')}</option>
      ))}
    </select>
  )
}
