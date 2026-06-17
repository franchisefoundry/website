'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

export default function InviteFranchisorButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: name, role: 'franchisor' }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      return
    }

    setSuccess(true)
    setTimeout(() => {
      setOpen(false)
      setSuccess(false)
      setName('')
      setEmail('')
      router.refresh()
    }, 1500)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Invite franchisor</Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite a franchisor"
        description="They'll receive an email to set up their account and fill in their brand profile."
      >
        {success ? (
          <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            Invite sent successfully.
          </p>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <Field label="Contact name">
              <Input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Brand contact name"
              />
            </Field>
            <Field label="Email address">
              <Input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="brand@example.com"
              />
            </Field>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" fullWidth onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Sending…' : 'Send invite'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
