'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lead = any

const STATUS_COLOURS: Record<string, string> = {
  submitted:  'bg-slate-100 text-slate-600',
  approved:   'bg-emerald-50 text-emerald-700',
  rejected:   'bg-red-50 text-red-600',
  invited:    'bg-sky-50 text-sky-700',
  registered: 'bg-violet-50 text-violet-700',
  matched:    'bg-amber-50 text-amber-700',
  intro_made: 'bg-orange-50 text-orange-700',
  signed:     'bg-teal-50 text-teal-700',
  paid:       'bg-green-50 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted', approved: 'Approved', rejected: 'Rejected',
  invited: 'Invited', registered: 'Registered', matched: 'Matched',
  intro_made: 'Intro Made', signed: 'Signed', paid: 'Paid',
}

export default function IntroducerLeadsClient({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'complete'>('all')
  const [actionLead, setActionLead] = useState<Lead | null>(null)
  const [actionType, setActionType] = useState<'reject' | 'invite' | 'detail' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const filtered = leads.filter(l => {
    if (filter === 'pending')  return l.status === 'submitted'
    if (filter === 'active')   return ['approved', 'invited', 'registered', 'matched', 'intro_made'].includes(l.status)
    if (filter === 'complete') return ['signed', 'paid', 'rejected'].includes(l.status)
    return true
  })

  async function handleApprove(lead: Lead) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/introducer-leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      if (!res.ok) throw new Error('Failed to approve')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!actionLead) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/introducer-leads/${actionLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejection_reason: rejectionReason }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      setActionLead(null)
      setActionType(null)
      setRejectionReason('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(lead: Lead) {
    setActionLead(lead)
    setActionType('invite')
    setLoading(true)
    setInviteLink(null)
    setError(null)
    try {
      const res = await fetch(`/api/admin/introducer-leads/${lead.id}/invite`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate invite')
      setInviteLink(data.invite_link)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  function closeModal() {
    setActionLead(null)
    setActionType(null)
    setRejectionReason('')
    setInviteLink(null)
    setError(null)
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
        {([
          { key: 'all',     label: `All (${leads.length})` },
          { key: 'pending', label: `Pending review (${leads.filter(l => l.status === 'submitted').length})` },
          { key: 'active',  label: 'Active' },
          { key: 'complete', label: 'Complete' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">No leads in this category.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs">
                <th className="text-left px-4 py-3 font-medium">Introducer</th>
                <th className="text-left px-4 py-3 font-medium">Lead</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Budget</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Source</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Submitted</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-slate-700">{lead.profiles?.full_name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{lead.profiles?.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{lead.first_name} {lead.last_name}</p>
                    <p className="text-xs text-slate-400">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                    {lead.investment_min && lead.investment_max
                      ? `£${(lead.investment_min/1000).toFixed(0)}k–£${(lead.investment_max/1000).toFixed(0)}k`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{lead.source ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[lead.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">
                    {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {lead.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => handleApprove(lead)}
                            disabled={loading}
                            className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setActionLead(lead); setActionType('reject') }}
                            className="text-xs px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {lead.status === 'approved' && (
                        <button
                          onClick={() => handleInvite(lead)}
                          disabled={loading}
                          className="text-xs px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors disabled:opacity-50"
                        >
                          Send invite
                        </button>
                      )}
                      {lead.introducer_notes && (
                        <button
                          onClick={() => { setActionLead(lead); setActionType('detail') }}
                          className="text-xs text-slate-400 hover:text-slate-600"
                          title="View notes"
                        >
                          📝
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {actionLead && actionType === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Reject lead</h3>
            <p className="text-xs text-slate-400 mb-4">
              Rejecting {actionLead.first_name} {actionLead.last_name}. The introducer will see this reason.
            </p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection (optional but helpful)…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Rejecting…' : 'Confirm reject'}
              </button>
              <button onClick={closeModal} className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {actionLead && actionType === 'invite' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Invite sent</h3>
            {loading ? (
              <p className="text-sm text-slate-500">Generating invite link…</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : inviteLink ? (
              <>
                <p className="text-xs text-slate-400 mb-4">
                  Magic link for <strong>{actionLead.first_name} {actionLead.last_name}</strong> ({actionLead.email}). Send this to them directly.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 break-all mb-4">
                  {inviteLink}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors mb-2"
                >
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </>
            ) : null}
            <button onClick={closeModal} className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      )}

      {actionLead && actionType === 'detail' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Introducer notes</h3>
            <p className="text-xs text-slate-400 mb-3">{actionLead.first_name} {actionLead.last_name}</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{actionLead.introducer_notes}</p>
            <button onClick={closeModal} className="mt-4 w-full px-4 py-2.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
