'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function InviteIntroducerButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
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
      setInviteLink(data.invite_link)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  function close() {
    setOpen(false); setName(''); setEmail(''); setError(null); setInviteLink(null); setCopied(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        + Invite introducer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            {!inviteLink ? (
              <>
                <h3 className="text-base font-semibold text-slate-800 mb-4">Invite introducer</h3>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email address</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                    />
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit" disabled={loading}
                      className="flex-1 bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
                    >
                      {loading ? 'Creating…' : 'Create & get invite link'}
                    </button>
                    <button type="button" onClick={close} className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50">
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-slate-800 mb-1">✓ Introducer created</h3>
                <p className="text-xs text-slate-400 mb-4">Send this magic link to {name}. It expires after use.</p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 break-all mb-4">
                  {inviteLink}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors mb-2"
                >
                  {copied ? '✓ Copied!' : 'Copy invite link'}
                </button>
                <button onClick={close} className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50">
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
