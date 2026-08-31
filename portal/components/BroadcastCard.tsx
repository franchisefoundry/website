'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/lib/toast'

const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'franchisee', label: 'Franchisees' },
  { value: 'franchisor', label: 'Franchisors' },
  { value: 'introducer', label: 'Introducers' },
  { value: 'admin', label: 'Admins' },
] as const

/**
 * Admin-only composer: send an announcement to a role (or everyone). Delivers
 * in-app to all recipients and push/email to those who haven't opted out.
 */
export default function BroadcastCard() {
  const [audience, setAudience] = useState<string>('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!title.trim()) {
      toast('Add a title first', 'error')
      return
    }
    const audienceLabel = AUDIENCES.find(a => a.value === audience)?.label ?? audience
    if (!window.confirm(`Send this announcement to ${audienceLabel}?`)) return

    setSending(true)
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience, title, body, link }),
    })
    setSending(false)

    if (res.ok) {
      const { sent } = await res.json().catch(() => ({ sent: 0 }))
      toast(`Announcement sent to ${sent} ${sent === 1 ? 'person' : 'people'}`, 'success')
      setTitle('')
      setBody('')
      setLink('')
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Failed to send' }))
      toast(error || 'Failed to send', 'error')
    }
  }

  const inputClass =
    'w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ff-green'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send an announcement</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-xs text-ink-3">
          Broadcasts a notification to the chosen audience. Everyone gets it in the bell; those who
          allow it also receive push and email.
        </p>

        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1">Audience</label>
          <select value={audience} onChange={e => setAudience(e.target.value)} className={inputClass}>
            {AUDIENCES.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Portal maintenance this weekend"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1">Message (optional)</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="A short message…"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1">Link (optional)</label>
          <input
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="/franchisee/matches"
            className={inputClass}
          />
        </div>

        <button
          type="button"
          onClick={send}
          disabled={sending || !title.trim()}
          className="rounded-lg bg-ff-green px-4 py-2 text-sm font-medium text-white hover:bg-ff-green-deep disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send announcement'}
        </button>
      </CardBody>
    </Card>
  )
}
