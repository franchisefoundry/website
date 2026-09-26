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
      <div className="bg-ff-green-soft border border-ff-green/20 rounded-2xl p-4 space-y-2">
        <p className="text-sm font-semibold text-ff-green text-center">✓ Approved &amp; invited</p>
        {convertedFranchiseeId && (
          <Link
            href={`/admin/franchisees/${convertedFranchiseeId}`}
            className="block text-xs text-center text-ff-green underline underline-offset-2 hover:text-ff-green transition-colors"
          >
            View franchisee profile →
          </Link>
        )}
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="bg-surface-2 border border-line rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-ink-2 mb-1">Lead rejected</h3>
        <p className="text-xs text-ink-3 mb-4">This lead was rejected. You can restore it to active if needed.</p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button
          disabled={loading !== null}
          onClick={() => patchStatus('new', 'restore')}
          className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-white border border-line text-ink-2 hover:bg-surface-2 transition-colors disabled:opacity-50"
        >
          {loading === 'restore' ? 'Restoring…' : 'Restore lead'}
        </button>
      </div>
    )
  }

  // Active states: new | meeting_requested
  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-ink mb-1">Approve or reject</h3>
      <p className="text-xs text-ink-3 mb-4">
        Approving sends a portal invite, creates their franchisee profile, and transfers their matches.
        Rejecting archives the lead — it can be restored later.
      </p>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      <div className="space-y-2">
        <button
          disabled={loading !== null}
          onClick={() => patchStatus('converted', 'approve')}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-ff-green text-white hover:bg-ff-green/90 transition-colors disabled:opacity-50"
        >
          {loading === 'approve' ? 'Approving…' : '✓ Approve & invite'}
        </button>
        <button
          disabled={loading !== null}
          onClick={() => patchStatus('rejected', 'reject')}
          className="w-full py-2 px-4 rounded-lg text-sm font-medium text-ink-3 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {loading === 'reject' ? 'Rejecting…' : '✕ Reject'}
        </button>
      </div>
    </div>
  )
}
