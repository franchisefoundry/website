'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CheckIcon } from '@/components/icons'

export interface AgreementComment {
  id: string
  body: string
  section_ref: string | null
  created_at: string
  author_name: string
  resolved: boolean
}

/** Brand comments (redlines) on an agreement, with admin resolve / reopen. */
export function AgreementComments({ comments: initial }: { comments: AgreementComment[] }) {
  const [comments, setComments] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)

  async function setResolved(id: string, resolved: boolean) {
    setBusy(id)
    const prev = comments
    setComments(cs => cs.map(c => (c.id === id ? { ...c, resolved } : c)))
    try {
      const res = await fetch(`/api/admin/agreements/comments/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolved }) })
      if (!res.ok) setComments(prev)
    } catch { setComments(prev) } finally { setBusy(null) }
  }

  const openCount = comments.filter(c => !c.resolved).length

  if (comments.length === 0) {
    return <p className="text-xs text-ink-3">No comments yet. Queries the brand raises on the agreement appear here for you to review and address.</p>
  }

  return (
    <ul className="space-y-3">
      {comments.map(c => (
        <li key={c.id} className={cn('rounded-xl border px-3.5 py-3 transition-colors', c.resolved ? 'border-line-2 bg-surface-2/50' : 'border-line')}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-semibold text-ink">{c.author_name}</span>
            {c.section_ref && <span className="text-[10px] font-medium text-ff-gold-ink bg-ff-gold-soft rounded px-1.5 py-0.5">on {c.section_ref}</span>}
            {c.resolved && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ff-green bg-ff-green-soft rounded px-1.5 py-0.5"><CheckIcon className="w-2.5 h-2.5" /> Addressed</span>}
            <span className="text-[10px] text-ink-3 ml-auto">{formatDate(c.created_at)}</span>
          </div>
          <p className={cn('text-xs leading-relaxed', c.resolved ? 'text-ink-3' : 'text-ink-2')}>{c.body}</p>
          <div className="mt-2">
            {c.resolved ? (
              <button onClick={() => setResolved(c.id, false)} disabled={busy === c.id} className="text-[11px] font-medium text-ink-3 hover:text-ink-2 disabled:opacity-50">Reopen</button>
            ) : (
              <button onClick={() => setResolved(c.id, true)} disabled={busy === c.id} className="inline-flex items-center gap-1 text-[11px] font-semibold text-ff-green hover:underline disabled:opacity-50"><CheckIcon className="w-3 h-3" /> Mark addressed</button>
            )}
          </div>
        </li>
      ))}
      {openCount === 0 && <li className="text-[11px] text-ff-green font-medium">All comments addressed.</li>}
    </ul>
  )
}
