'use client'

import { useState, useRef } from 'react'

const RATING_OPTIONS = [
  { value: 1, label: '1 — Poor fit' },
  { value: 2, label: '2 — Weak' },
  { value: 3, label: '3 — Average' },
  { value: 4, label: '4 — Strong' },
  { value: 5, label: '5 — Excellent' },
]

interface Props {
  franchiseeId: string
  initialNotes: string | null
  initialRating: number | null
}

export default function MeetingNotes({ franchiseeId, initialNotes, initialRating }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [rating, setRating] = useState<number | null>(initialRating ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function save(updatedNotes: string, updatedRating: number | null) {
    setSaving(true)
    setSaved(false)
    try {
      await fetch(`/api/admin/franchisees/${franchiseeId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_notes: updatedNotes, internal_rating: updatedRating }),
      })
      setSaved(true)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Rating */}
      <div>
        <label className="text-xs font-semibold text-ink-3 uppercase tracking-wider block mb-2">
          Internal rating
        </label>
        <div className="flex gap-2 flex-wrap">
          {RATING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                const next = rating === opt.value ? null : opt.value
                setRating(next)
                save(notes, next)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                rating === opt.value
                  ? 'bg-ff-green text-white border-ff-green'
                  : 'bg-white text-ink-2 border-line hover:border-ff-green hover:text-ff-green'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes textarea */}
      <div>
        <label className="text-xs font-semibold text-ink-3 uppercase tracking-wider block mb-2">
          Meeting notes
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => save(notes, rating)}
          rows={6}
          placeholder="Add notes from your meeting, observations about the candidate, key discussion points…"
          className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink-2 placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-ff-green/30 focus:border-ff-green resize-none transition-colors"
        />
      </div>

      {/* Save status */}
      <div className="flex items-center justify-end h-5">
        {saving && <span className="text-xs text-ink-3">Saving…</span>}
        {saved && !saving && <span className="text-xs text-ff-green">✓ Saved</span>}
      </div>
    </div>
  )
}
