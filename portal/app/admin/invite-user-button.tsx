'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Invite user
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Invite user</h2>
            <p className="text-sm text-slate-500 mb-5">
              They&apos;ll receive an email to set their password and access the portal.
            </p>

            {success ? (
              <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                Invite sent successfully.
              </p>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as Role)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent bg-white"
                  >
                    <option value="franchisee">Franchisee</option>
                    <option value="franchisor">Franchisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={reset}
                    className="flex-1 border border-slate-300 text-slate-700 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {loading ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
