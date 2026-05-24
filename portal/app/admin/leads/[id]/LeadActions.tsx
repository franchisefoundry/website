'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  leadId: string
  status: string
  convertedFranchiseeId?: string | null
}

export default function LeadActions({ leadId, status, convertedFranchiseeId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | 'restore' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function patchStatus(newStatus: string, action: 'approve' | 'reject' | 'restore') {
    setLoading(action)
    setError(null)
    try {
      if (action === 'approve') {
        const res = await fetch(`/api/admin/leads/${leadId}/convert`, { method: 'POST' })
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? 'Something went wrong'); return }
      } else {
        const res = await fetch(`/api/admin/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? 'Something went wrong'); return }
      }
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  if (status === 'converted') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
        <p className="text-sm font-semibold text-emerald-700 text-center">✓ Approved &amp; invited</p>
        {convertedFranchiseeId && (
          <Link
            href={`/admin/franchisees/${convertedFranchiseeId}`}
            className="block text-xs text-center text-emerald-600 underline underline-offset-2 hover:text-emerald-800 transition-colors"
          >
            View franchisee profile →
          </Link>
        )}
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Lead rejected</h3>
        <p className="text-xs text-slate-400 mb-4">This lead was rejected. You can restore it to active if needed.</p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button
          disabled={loading !== null}
          onClick={() => patchStatus('new', 'restore')}
          className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {loading === 'restore' ? 'Restoring…' : 'Restore lead'}
        </button>
      </div>
    )
  }

  // Active states: new | meeting_requested
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Approve or reject</h3>
      <p className="text-xs text-slate-500 mb-4">
        Approving sends a portal invite, creates their franchisee profile, and transfers their matches.
        Rejecting archives the lead — it can be restored later.
      </p>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      <div className="space-y-2">
        <button
          disabled={loading !== null}
          onClick={() => patchStatus('converted', 'approve')}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-brand-green text-white hover:bg-brand-green/90 transition-colors disabled:opacity-50"
        >
          {loading === 'approve' ? 'Approving…' : '✓ Approve & invite'}
        </button>
        <button
          disabled={loading !== null}
          onClick={() => patchStatus('rejected', 'reject')}
          className="w-full py-2 px-4 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {loading === 'reject' ? 'Rejecting…' : '✕ Reject'}
        </button>
      </div>
    </div>
  )
}
