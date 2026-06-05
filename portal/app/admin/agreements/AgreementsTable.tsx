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
      return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✓ Signed</span>
    case 'sent':
      return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">⏳ Awaiting signature</span>
    default:
      return <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">— Not sent</span>
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
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
        No franchisors onboarded yet.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Franchisor</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Sent</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Signed by</th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {allRows.map(row => {
            const fp = row.franchisor
            const p = fp.profiles
            const name = fp.brand_name || p?.full_name || 'Unnamed'
            const a = row.agreement

            return (
              <tr key={fp.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={name} size="sm" />
                    <div>
                      <p className="font-medium text-slate-900">{name}</p>
                      <p className="text-xs text-slate-400">{p?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3">
                  {a ? agreementStatusBadge(a.status) : agreementStatusBadge('not_sent')}
                </td>
                <td className="px-6 py-3 text-slate-500 hidden md:table-cell">
                  {a?.sent_at ? formatDate(a.sent_at) : '—'}
                </td>
                <td className="px-6 py-3 text-slate-500 hidden md:table-cell">
                  {a?.status === 'signed' ? (
                    <span>
                      <span className="text-slate-800 font-medium">{a.signer_name}</span>
                      {a.signed_at && (
                        <span className="text-xs text-slate-400 ml-1">{timeAgo(a.signed_at)}</span>
                      )}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {a?.status === 'signed' && a.signed_pdf_path && (
                      <a
                        href={`/api/admin/agreements/download/${a.id}`}
                        className="text-xs text-brand-green hover:underline font-medium"
                      >
                        Download PDF
                      </a>
                    )}
                    {(!a || a.status === 'not_sent') && (
                      <button
                        onClick={() => sendAgreement(fp.id)}
                        disabled={sending === fp.id || !hasTemplate}
                        className="text-xs bg-brand-green hover:bg-brand-green-dark text-white font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {sending === fp.id ? 'Sending…' : 'Send agreement'}
                      </button>
                    )}
                    {a?.status === 'sent' && (
                      <button
                        onClick={() => sendAgreement(fp.id)}
                        disabled={sending === fp.id}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        {sending === fp.id ? 'Resending…' : 'Resend'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
