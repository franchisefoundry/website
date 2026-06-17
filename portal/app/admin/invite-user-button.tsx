'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'

type Role = 'franchisee' | 'franchisor' | 'admin'

export default function InviteUserButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('franchisee')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  function reset() {
    setOpen(false)
    setSuccess(false)
    setName('')
    setEmail('')
    setRole('franchisee')
    setError(null)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    let res: Response
    let data: { error?: string; success?: boolean }

    try {
      res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: name, role }),
      })
      data = await res.json()
    } catch (err) {
      setError(`Request failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setLoading(false)
      return
    }

    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      return
    }

    setSuccess(true)
    setTimeout(() => {
      reset()
      router.refresh()
    }, 1500)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Invite user</Button>

      <Modal
        open={open}
        onClose={reset}
        title="Invite user"
        description="They'll receive an email to set their password and access the portal."
      >
        {success ? (
          <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            Invite sent successfully.
          </p>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <Field label="Full name">
              <Input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
              />
            </Field>
            <Field label="Email address">
              <Input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </Field>
            <Field label="Role">
              <Select value={role} onChange={e => setRole(e.target.value as Role)}>
                <option value="franchisee">Franchisee</option>
                <option value="franchisor">Franchisor</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" fullWidth onClick={reset}>
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
