'use client'

import { useState } from 'react'
import { formatDate, timeAgo } from '@/lib/utils'
import { statusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/Avatar'

interface FranchisorAgreement {
  id: string
  status: string
  sent_at: string | null
  signed_at: string | null
  signer_name: string | null
  signed_pdf_path: string | null
  franchisor_profiles: {
    id: string
    brand_name: string | null
    user_id: string
    profiles: { full_name: string | null; email: string | null } | null
  }
}

interface FranchisorRow {
  id: string
  brand_name: string | null
  user_id: string
  profiles: { full_name: string | null; email: string | null } | null
}

function agreementStatusBadge(status: string) {
  switch (status) {
    case 'signed':
      return <span className="inline-flex items-center gap-1 text-xs font-medium text-ff-green bg-ff-green-soft border border-ff-green/20 px-2 py-0.5 rounded-full">✓ Signed</span>
    case 'sent':
      return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">⏳ Awaiting signature</span>
    default:
      return <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 bg-surface-2 border border-line px-2 py-0.5 rounded-full">— Not sent</span>
  }
}

export default function AgreementsTable({
  franchisorAgreements,
  allFranchisors,
  hasTemplate,
}: {
  franchisorAgreements: FranchisorAgreement[]
  allFranchisors: FranchisorRow[]
  hasTemplate: boolean
}) {
  const [sending, setSending] = useState<string | null>(null)
  const [localAgreements, setLocalAgreements] = useState(franchisorAgreements)

  // Franchisors not yet in the agreements table
  const sentIds = new Set(localAgreements.map(a => a.franchisor_profiles.id))
  const unsent = allFranchisors.filter(f => !sentIds.has(f.id))

  async function sendAgreement(franchisorProfileId: string) {
    if (!hasTemplate) { alert('Please create an agreement template first.'); return }
    setSending(franchisorProfileId)
    try {
      const res = await fetch('/api/admin/agreements/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ franchisorProfileId }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d.error ?? 'Failed to send'); return }
      // Refresh page to show updated table
      window.location.reload()
    } finally {
      setSending(null)
    }
  }

  const allRows = [
    ...localAgreements.map(a => ({ type: 'sent' as const, agreement: a, franchisor: a.franchisor_profiles })),
    ...unsent.map(f => ({ type: 'unsent' as const, agreement: null, franchisor: f })),
  ]

  if (allRows.length === 0) {
    return (
      <div className="text-center py-16 text-ink-3 text-sm">No franchisors onboarded yet.</div>
    )
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
      {allRows.map(row => {
        const fp = row.franchisor
        const p = fp.profiles
        const name = fp.brand_name || p?.full_name || 'Unnamed'
        const a = row.agreement
        return (
          <div key={fp.id} className="bg-surface border border-line rounded-2xl p-[17px] shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={name} size="lg" square />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">{name}</p>
                <p className="text-xs text-ink-3 truncate">{p?.email}</p>
              </div>
            </div>

            <div className="mb-3">{a ? agreementStatusBadge(a.status) : agreementStatusBadge('not_sent')}</div>

            <div className="text-xs text-ink-2 space-y-1 mb-3.5">
              <div className="flex justify-between"><span className="text-ink-3">Sent</span><span>{a?.sent_at ? formatDate(a.sent_at) : '—'}</span></div>
              <div className="flex justify-between">
                <span className="text-ink-3">Signed by</span>
                <span>{a?.status === 'signed' ? `${a.signer_name}${a.signed_at ? ` · ${timeAgo(a.signed_at)}` : ''}` : '—'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-line-2">
              {a?.status === 'signed' && a.signed_pdf_path && (
                <a href={`/api/admin/agreements/download/${a.id}`} className="text-xs font-medium text-ff-green hover:underline">Download PDF</a>
              )}
              {(!a || a.status === 'not_sent') && (
                <button onClick={() => sendAgreement(fp.id)} disabled={sending === fp.id || !hasTemplate}
                  className="text-xs bg-ff-green hover:brightness-110 text-white font-medium px-3.5 py-2 rounded-xl transition-all disabled:opacity-50">
                  {sending === fp.id ? 'Sending…' : 'Send agreement'}
                </button>
              )}
              {a?.status === 'sent' && (
                <button onClick={() => sendAgreement(fp.id)} disabled={sending === fp.id}
                  className="text-xs text-ink-2 font-medium px-3.5 py-2 rounded-xl border border-line hover:bg-surface-2 transition-colors disabled:opacity-50">
                  {sending === fp.id ? 'Resending…' : 'Resend'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
