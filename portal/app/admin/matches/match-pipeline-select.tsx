'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MATCH_PIPELINE_STAGES } from '@/lib/supabase/types'

interface Props {
  matchId: string
  currentStage: string | null
}

export default function MatchPipelineSelect({ matchId, currentStage }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('matches')
      .update({ pipeline_stage: e.target.value || null })
      .eq('id', matchId)
    setLoading(false)
    router.refresh()
  }

  const current = MATCH_PIPELINE_STAGES.find(s => s.value === currentStage)

  return (
    <div className="flex items-center gap-1.5">
      {current && <span className="text-sm">{current.emoji}</span>}
      <select
        value={currentStage ?? ''}
        onChange={handleChange}
        disabled={loading}
        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-green bg-white disabled:opacity-60"
      >
        <option value="">— No pipeline stage —</option>
        {MATCH_PIPELINE_STAGES.map(s => (
          <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
        ))}
      </select>
    </div>
  )
}
