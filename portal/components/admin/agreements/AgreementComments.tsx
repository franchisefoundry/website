'use client'

import { useState } from 'react'
import { formatDate, cn } from '@/lib/utils'
import { CheckIcon } from '@/components/icons'

export interface AgreementComment {
  id: string
  body: string
  section_ref: string | null
  created_at: string
  author_name: string
  resolved: boolean
  admin_reply: string | null
  admin_reply_at: string | null
}

/** Brand comments (redlines) on an agreement, with admin reply / resolve / reopen. */
export function AgreementComments({ comments: initial }: { comments: AgreementComment[] }) {
  const [comments, setComments] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  async function post(id: string, payload: { resolved?: boolean; reply?: string }) {
    setBusy(id)
    const prev = comments
    try {
      const res = await fetch(`/api/admin/agreements/comments/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { setComments(prev); return }
      const d = await res.json().catch(() => ({}))
      setComments(cs => cs.map(c => {
        if (c.id !== id) return c
        const next = { ...c }
        if (typeof payload.resolved === 'boolean') next.resolved = payload.resolved
        if (payload.reply) { next.admin_reply = d.admin_reply ?? payload.reply; next.admin_reply_at = d.admin_reply_at ?? new Date().toISOString(); next.resolved = true }
        return next
      }))
      if (payload.reply) setDrafts(dr => ({ ...dr, [id]: '' }))
    } finally { setBusy(null) }
  }

  if (comments.length === 0) {
    return <p className="text-xs text-ink-3">No comments yet. Queries the brand raises on the agreement appear here for you to reply to and resolve.</p>
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

          {/* The team's reply */}
          {c.admin_reply && (
            <div className="mt-2 ml-3 pl-3 border-l-2 border-ff-green/30">
              <p className="text-[10px] font-semibold text-ff-green mb-0.5">Franchise Foundry replied{c.admin_reply_at ? ` · ${formatDate(c.admin_reply_at)}` : ''}</p>
              <p className="text-xs text-ink-2 leading-relaxed">{c.admin_reply}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-2.5">
            {!c.resolved ? (
              <div className="space-y-2">
                <textarea value={drafts[c.id] ?? ''} onChange={e => setDrafts(dr => ({ ...dr, [c.id]: e.target.value }))} rows={2}
                  placeholder="Reply to the brand…"
                  className="w-full text-xs bg-surface-2 border border-line rounded-lg px-2.5 py-2 resize-none focus:bg-surface focus:outline-none focus:ring-2 focus:ring-ff-green/30" />
                <div className="flex items-center gap-3">
                  <button onClick={() => post(c.id, { reply: (drafts[c.id] ?? '').trim() })} disabled={busy === c.id || !(drafts[c.id] ?? '').trim()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-ff-green rounded-lg px-2.5 py-1.5 hover:brightness-110 disabled:opacity-50 transition-all">Reply &amp; resolve</button>
                  <button onClick={() => post(c.id, { resolved: true })} disabled={busy === c.id} className="text-[11px] font-medium text-ink-2 hover:text-ink disabled:opacity-50">Mark addressed</button>
                </div>
              </div>
            ) : (
              <button onClick={() => post(c.id, { resolved: false })} disabled={busy === c.id} className="text-[11px] font-medium text-ink-3 hover:text-ink-2 disabled:opacity-50">Reopen</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
