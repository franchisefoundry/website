'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { referralLink } from '@/lib/referral'
import { toast } from '@/lib/toast'

type Agent = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  referral_code: string | null
  created_at: string
}

type Counts = { total: number; pending: number; active: number }

export default function AgentsTable({
  agents,
  countsByAgent,
}: {
  agents: Agent[]
  countsByAgent: Record<string, Counts>
}) {
  const router = useRouter()
  const [confirmId, setConfirmId]   = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [referralAgent, setReferralAgent] = useState<Agent | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [editCode, setEditCode] = useState('')
  const [savingCode, setSavingCode] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  const referralUrl = referralAgent?.referral_code ? referralLink(referralAgent.referral_code) : null

  function openReferral(agent: Agent) {
    setReferralAgent(agent)
    setEditCode(agent.referral_code ?? '')
    setSent(false)
    setCodeError(null)
  }

  const codeChanged = !!referralAgent && editCode.trim() !== (referralAgent.referral_code ?? '')

  async function saveCode() {
    if (!referralAgent) return
    setSavingCode(true)
    setCodeError(null)
    const res = await fetch(`/api/admin/introducers/${referralAgent.id}/referral`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: editCode.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setSavingCode(false)
    if (res.ok) {
      setReferralAgent({ ...referralAgent, referral_code: data.code })
      setEditCode(data.code)
      setSent(false)
      toast('Referral code updated')
      router.refresh()
    } else {
      setCodeError(data.error ?? 'Could not save the code.')
    }
  }

  function copyLink() {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl)
      toast('Link copied')
    }
  }

  async function sendReferral() {
    if (!referralAgent) return
    setSending(true)
    const res = await fetch(`/api/admin/introducers/${referralAgent.id}/referral`, { method: 'POST' })
    setSending(false)
    if (res.ok) {
      setSent(true)
      toast(`Referral link emailed to ${referralAgent.full_name ?? 'agent'}`)
    } else {
      const data = await res.json().catch(() => ({}))
      toast(data.error ?? 'Could not send email')
    }
  }

  function closeReferral() {
    setReferralAgent(null)
    setSent(false)
  }

  async function handleDelete() {
    if (!confirmId) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/introducers/${confirmId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setConfirmId(null)
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error')
    } finally {
      setDeleting(false)
    }
  }

  const confirmAgent = agents.find(a => a.id === confirmId)

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500 text-xs">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Mobile</th>
              <th className="text-left px-4 py-3 font-medium">Total leads</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Not invited</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Active</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => {
              const counts = countsByAgent[agent.id] ?? { total: 0, pending: 0, active: 0 }
              return (
                <tr key={agent.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{agent.full_name ?? '—'}</p>
                    <p className="text-xs text-slate-400 md:hidden">{agent.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{agent.email}</td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{agent.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{counts.total}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {counts.pending > 0
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">{counts.pending}</span>
                      : <span className="text-slate-400">0</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{counts.active}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                    {new Date(agent.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-4">
                      <button
                        onClick={() => openReferral(agent)}
                        className="text-xs text-brand-green hover:text-brand-green/80 font-medium transition-colors whitespace-nowrap"
                      >
                        Referral link
                      </button>
                      <button
                        onClick={() => { setConfirmId(agent.id); setDeleteError(null) }}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Referral link modal */}
      <Modal
        open={!!referralAgent}
        onClose={closeReferral}
        title="Agent referral link"
        description={`Share this link with ${referralAgent?.full_name ?? 'this agent'}. Leads who complete the matching quiz through it are attributed to them.`}
      >
        {referralUrl ? (
          <>
            {/* Personalise the code */}
            <label className="block text-xs font-medium text-slate-600 mb-1">Personalised code</label>
            <div className="flex gap-2 mb-1">
              <div className="flex-1 flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-green">
                <span className="pl-3 pr-1 text-xs text-slate-400 select-none">/get-matched?ref=</span>
                <input
                  value={editCode}
                  onChange={e => { setEditCode(e.target.value); setCodeError(null) }}
                  placeholder="jane-smith"
                  className="flex-1 min-w-0 py-2 pr-3 text-sm text-slate-800 focus:outline-none"
                />
              </div>
              <Button size="sm" onClick={saveCode} disabled={!codeChanged || savingCode}>
                {savingCode ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {codeError
              ? <p className="text-xs text-red-600 mb-4">{codeError}</p>
              : <p className="text-xs text-slate-400 mb-4">3–30 letters, numbers or hyphens.</p>}

            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-700 break-all mb-4">
              {referralUrl}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={copyLink}>Copy link</Button>
              <Button fullWidth onClick={sendReferral} disabled={sending}>
                {sending ? 'Sending…' : sent ? '✓ Emailed' : 'Email to agent'}
              </Button>
            </div>
            {sent && (
              <p className="text-xs text-emerald-600 mt-3 text-center">
                Sent to {referralAgent?.email}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">No referral code available for this agent.</p>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => !deleting && setConfirmId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-2">Remove agent?</h3>
            <p className="text-sm text-slate-500 mb-1">
              This will permanently delete{' '}
              <span className="font-medium text-slate-700">{confirmAgent?.full_name ?? confirmAgent?.email}</span>
              &apos;s account and all their leads.
            </p>
            <p className="text-xs text-red-600 mb-5">This cannot be undone.</p>
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
              >
                {deleting ? 'Removing…' : 'Yes, remove'}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                disabled={deleting}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
