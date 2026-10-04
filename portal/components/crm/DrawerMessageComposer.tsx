'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DrawerMessageComposer({
  threadType, threadId, who,
}: {
  threadType: 'franchisee' | 'franchisor' | 'introducer'
  threadId: string
  who: string
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!body.trim() || sending) return
    setSending(true)
    await fetch('/api/admin/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_type: threadType, thread_id: threadId, body }),
    }).catch(() => {})
    setBody('')
    setSending(false)
    router.refresh()
  }

  return (
    <div className="flex items-end gap-2 border border-line rounded-xl p-2 bg-surface mt-3">
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        rows={1}
        placeholder={`Message ${who}…`}
        className="flex-1 bg-transparent outline-none resize-none text-sm text-ink max-h-24"
      />
      <button onClick={send} disabled={sending || !body.trim()}
        className="px-3.5 py-2 rounded-lg text-sm font-medium bg-ff-green text-white hover:brightness-110 transition-all disabled:opacity-50">
        {sending ? '…' : 'Send'}
      </button>
    </div>
  )
}
