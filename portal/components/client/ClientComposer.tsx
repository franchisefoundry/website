'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SendIcon } from '@/components/icons'

/** Message composer for the client Messages thread. Posts to /api/messages. */
export function ClientComposer() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    const body = value.trim()
    if (!body || sending) return
    setSending(true)
    const res = await fetch('/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    setSending(false)
    if (res.ok) { setValue(''); router.refresh() }
  }

  return (
    <div className="flex items-end gap-2 border border-line rounded-2xl p-2 bg-surface">
      <textarea
        rows={1}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        placeholder="Message the Franchise Foundry team…"
        className="flex-1 bg-transparent outline-none resize-none text-sm text-ink px-2 py-1.5 max-h-32"
      />
      <button onClick={send} disabled={sending || !value.trim()}
        aria-label="Send"
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-ff-green text-white hover:brightness-110 disabled:opacity-50 transition-all flex-shrink-0">
        <SendIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
