'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

interface Props {
  matchId: string
  initialInternal: string
  initialFranchisor: string
}

export default function MatchNotesInline({ matchId, initialInternal, initialFranchisor }: Props) {
  const [open, setOpen] = useState(false)
  const [internal, setInternal] = useState(initialInternal)
  const [franchisor, setFranchisor] = useState(initialFranchisor)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(field: 'internal_notes' | 'franchisor_notes', value: string) {
    setSaving(true)
    setSaved(false)
    const supabase = createClient()
    await supabase.from('matches').update({ [field]: value || null }).eq('id', matchId)
    setSaving(false)
    setSaved(true)
    toast('Notes saved')
    setTimeout(() => setSaved(false), 2000)
  }

  const hasNotes = internal.trim() || franchisor.trim()

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`text-xs flex items-center gap-1.5 transition-colors ${
          hasNotes ? 'text-ff-green font-medium' : 'text-ink-3 hover:text-ink-2'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 2h12v10H9l-3 3v-3H2V2z"/>
        </svg>
        {hasNotes ? 'View notes' : 'Add notes'}
        {open ? ' ▲' : ' ▼'}
      </button>

      {open && (
        <div className="mt-2 space-y-3 p-3 bg-surface-2 rounded-lg border border-line">
          <div>
            <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-1">
              Internal notes <span className="text-ink-3 font-normal">(FF team only)</span>
            </p>
            <textarea
              value={internal}
              onChange={e => setInternal(e.target.value)}
              onBlur={e => save('internal_notes', e.target.value)}
              rows={2}
              placeholder="Notes for the FF team…"
              className="w-full px-2.5 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-ff-green resize-none text-ink-2 placeholder:text-ink-3"
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-1">
              Franchisor notes <span className="text-ink-3 font-normal">(shared with brand)</span>
            </p>
            <textarea
              value={franchisor}
              onChange={e => setFranchisor(e.target.value)}
              onBlur={e => save('franchisor_notes', e.target.value)}
              rows={2}
              placeholder="What the franchisor should know about this match…"
              className="w-full px-2.5 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-ff-green resize-none text-ink-2 placeholder:text-ink-3"
            />
          </div>
          {(saving || saved) && (
            <p className="text-[10px] text-ink-3">{saving ? 'Saving…' : '✓ Saved'}</p>
          )}
        </div>
      )}
    </div>
  )
}
