'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  requestId: string
  currentStatus: string
}

export default function IntroStatusSelect({ requestId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('intro_requests')
      .update({ status: e.target.value })
      .eq('id', requestId)
    setLoading(false)
    router.refresh()
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={loading}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-green bg-white disabled:opacity-60"
    >
      {['pending', 'sent', 'completed'].map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}
