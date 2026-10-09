'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SendIcon } from '@/components/icons'

/**
 * Message box for every thread type:
 *   • dm      → /api/dm (person-to-person); redirects to `redirectBase` + new conversation id
 *   • admin   → /api/admin/messages (team → a client's thread)
 *   • client  → /api/messages (client → the team)
 */
export function Composer({
  kind,
  payload,
  placeholder = 'Write a message…',
  redirectBase,
}: {
  kind: 'dm' | 'admin' | 'client'
  payload?: Record<string, string>
  placeholder?: string
  /** dm only: e.g. "/admin/messages?dm=" — the new conversation id is appended. */
  redirectBase?: string
}) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    const body = value.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    const url = kind === 'dm' ? '/api/dm' : kind === 'admin' ? '/api/admin/messages' : '/api/messages'
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, body }),
    })
    const data = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) { setError(data.error ?? 'Message not sent.'); return }
    setValue('')
    if (kind === 'dm' && redirectBase && data.conversation_id && !payload?.conversation_id) {
      router.push(`${redirectBase}${data.conversation_id}`)
    }
    router.refresh()
  }

  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-1.5 px-1">{error}</p>}
      <div className="flex items-end gap-2 border border-line rounded-2xl p-2 bg-surface">
        <textarea
          rows={1}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none resize-none text-sm text-ink px-2 py-1.5 max-h-32"
        />
        <button onClick={send} disabled={sending || !value.trim()} aria-label="Send"
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-ff-green text-white hover:brightness-110 disabled:opacity-50 transition-all flex-shrink-0">
          <SendIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
