'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  requestId: string
  currentStatus: string
}

export default function IntroStatusSelect({ requestId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    setStatus(next)          // instant visual update
    setSaving(true)
    const supabase = createClient()
    await supabase.from('intro_requests').update({ status: next }).eq('id', requestId)
    setSaving(false)
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={saving}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-green bg-white disabled:opacity-60"
    >
      {['pending', 'sent', 'completed'].map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}
