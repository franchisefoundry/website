'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, timeAgo } from '@/lib/utils'
import { toast } from '@/lib/toast'

export interface InviteRow {
  id: string
  email: string
  role: string
  full_name: string | null
  created_at: string
  invite_expires_at: string | null
  accepted: boolean
}

function statusInfo(row: InviteRow): { label: string; classes: string } {
  if (row.accepted) return { label: 'Accepted', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (!row.invite_expires_at || new Date(row.invite_expires_at) < new Date()) {
    return { label: 'Expired', classes: 'bg-red-50 text-red-600 border-red-200' }
  }
  return { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200' }
}

function InviteActions({ invite }: { invite: InviteRow }) {
  const [resending, setResending] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const router = useRouter()

  async function handleResend() {
    setResending(true)
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: invite.email, role: invite.role, full_name: invite.full_name }),
    })
    setResending(false)
    if (res.ok) {
      toast('Invite resent')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      toast(data.error ?? 'Failed to resend invite')
    }
  }

  async function handleRemove() {
    setRemoving(true)
    const res = await fetch(`/api/admin/invites/${invite.id}`, { method: 'DELETE' })
    setRemoving(false)
    if (res.ok) {
      toast('Invite removed')
      router.refresh()
    } else {
      toast('Could not remove invite')
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <div className="inline-flex items-center gap-3">
        <span className="text-xs text-slate-500">Remove?</span>
        <button
          onClick={handleRemove}
          disabled={removing}
          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {removing ? 'Removing…' : 'Yes'}
        </button>
        <button onClick={() => setConfirm(false)} disabled={removing} className="text-xs text-slate-400 hover:text-slate-600">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-4">
      {!invite.accepted && (
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-xs text-brand-green hover:text-brand-green/80 font-medium disabled:opacity-50 transition-colors"
        >
          {resending ? 'Sending…' : 'Resend'}
        </button>
      )}
      <button
        onClick={() => setConfirm(true)}
        className="text-xs text-slate-400 hover:text-red-600 font-medium transition-colors"
      >
        Remove
      </button>
    </div>
  )
}

export default function InvitesList({ invites }: { invites: InviteRow[] }) {
  if (invites.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 px-6 py-8 text-center text-sm text-slate-400">
        No invites sent yet.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Person</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Invited</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Expires</th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invites.map(invite => {
            const status = statusInfo(invite)
            return (
              <tr key={invite.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3">
                  <p className="font-medium text-slate-900">{invite.full_name || '—'}</p>
                  <p className="text-xs text-slate-400">{invite.email}</p>
                </td>
                <td className="px-6 py-3">
                  <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${status.classes}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-6 py-3 text-slate-500 text-xs">{timeAgo(invite.created_at)}</td>
                <td className="px-6 py-3 text-slate-400 text-xs hidden md:table-cell">
                  {invite.invite_expires_at ? formatDate(invite.invite_expires_at) : '—'}
                </td>
                <td className="px-6 py-3 text-right">
                  <InviteActions invite={invite} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
