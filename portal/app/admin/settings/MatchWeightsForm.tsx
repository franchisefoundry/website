'use client'

import { useState } from 'react'
import { saveWeights, type Weights } from './actions'
import { cn } from '@/lib/utils'

const DIMS: [keyof Weights, string][] = [
  ['budget', 'Budget fit'],
  ['location', 'Location / territory'],
  ['experience', 'Experience'],
  ['operator', 'Operator model'],
  ['timeline', 'Timeline'],
  ['format', 'Format'],
  ['full_time', 'Full-time availability'],
  ['multi_site', 'Multi-site interest'],
]

export function MatchWeightsForm({ initial }: { initial: Weights }) {
  const [w, setW] = useState<Weights>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const total = DIMS.reduce((s, [k]) => s + (Number(w[k]) || 0), 0)

  async function save() {
    setSaving(true)
    await saveWeights(w)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      {DIMS.map(([k, label]) => (
        <div key={k} className="mb-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-ink-2">{label}</span>
            <span className="font-bold text-ink tabular-nums">{w[k]}%</span>
          </div>
          <input type="range" min={0} max={40} value={w[k]}
            onChange={e => setW({ ...w, [k]: Number(e.target.value) })}
            className="w-full accent-ff-green" />
        </div>
      ))}

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-line-2">
        <span className={cn('text-sm font-medium', total === 100 ? 'text-ink-2' : 'text-amber-700')}>
          Total: <span className="font-bold tabular-nums">{total}%</span>{total !== 100 && ' · aim for 100'}
        </span>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-ff-green">Saved ✓</span>}
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-ff-green text-white hover:brightness-110 transition-all disabled:opacity-60">
            {saving ? 'Saving…' : 'Save weighting'}
          </button>
        </div>
      </div>
      <p className="text-xs text-ink-3 mt-3">Re-run matching (Match pipeline → Run matching) to apply new weights to scores.</p>
    </div>
  )
}
