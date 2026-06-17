'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

export default function InviteAgentButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const router = useRouter()

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email) { setError('Name and email are required.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/introducers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setSent(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  function close() {
    setOpen(false); setName(''); setEmail(''); setError(null); setSent(false)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Invite agent</Button>

      <Modal open={open} onClose={close} maxWidth="max-w-md" title={!sent ? 'Invite agent' : undefined}>
        {!sent ? (
          <form onSubmit={handleInvite} className="space-y-4">
            <Field label="Full name">
              <Input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
              />
            </Field>
            <Field label="Email address">
              <Input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </Field>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? 'Sending…' : 'Send invite'}
              </Button>
              <Button type="button" variant="secondary" size="lg" onClick={close}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="text-2xl mb-3">✓</div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Invite sent</h3>
            <p className="text-sm text-slate-500 mb-6">
              An invite email has been sent to <span className="font-medium text-slate-700">{email}</span>.
              They&apos;ll receive a sign-in link to set up their account.
            </p>
            <Button fullWidth size="lg" onClick={close}>Done</Button>
          </>
        )}
      </Modal>
    </>
  )
}
