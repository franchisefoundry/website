'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveIcon } from '@/components/icons'

const REASONS = ['No longer active', 'Withdrew / not proceeding', 'Duplicate record', 'Not the right fit', 'Signed elsewhere', 'Other']

/**
 * Archive a record with a required reason. Archiving keeps the record but pulls
 * all portal access (bans sign-in) and, for a brand, removes them from matching.
 */
export function ArchiveButton({
  type, id, name, redirectTo,
}: {
  type: 'franchisees' | 'franchisors' | 'introducers'
  id: string
  name: string
  redirectTo: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function archive() {
    setLoading(true)
    setError(null)
    const full = note.trim() ? `${reason} — ${note.trim()}` : reason
    const res = await fetch(`/api/admin/${type}/${id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: full }),
    })
    setLoading(false)
    if (res.ok) {
      setOpen(false)
      router.push(redirectTo)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Could not archive.')
    }
  }

  const input = 'w-full border border-line rounded-lg px-3 py-2 text-sm bg-surface text-ink outline-none focus:ring-2 focus:ring-ff-green'

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors">
        <ArchiveIcon className="w-4 h-4" /> Archive
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/40" onClick={e => { if (e.target === e.currentTarget && !loading) setOpen(false) }}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 pt-5">
              <h3 className="text-base font-semibold text-ink">Archive {name}</h3>
              <p className="text-sm text-ink-2 mt-1.5">Archiving keeps the record but <strong>removes all portal access</strong>{type === 'franchisors' ? ' and pulls the brand from matching' : ''}. A reason is required.</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">Reason</label>
                <select value={reason} onChange={e => setReason(e.target.value)} className={input}>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">Note (optional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Add context…" className={`${input} resize-none`} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-2.5 px-5 py-3.5 border-t border-line-2 bg-surface-2">
              <button onClick={() => setOpen(false)} disabled={loading} className="px-4 py-2 text-sm font-medium text-ink-2 border border-line rounded-xl hover:bg-surface transition-colors disabled:opacity-60">Cancel</button>
              <button onClick={archive} disabled={loading} className="px-4 py-2 text-sm font-medium bg-ff-green text-white rounded-xl hover:brightness-110 transition-all disabled:opacity-60">
                {loading ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
