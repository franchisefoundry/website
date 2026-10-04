'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate, timeAgo } from '@/lib/utils'
import { ArrowRightIcon } from '@/components/icons'

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

function statusPill(status: string) {
  if (status === 'signed') return <span className="inline-flex items-center text-xs font-medium text-ff-green bg-ff-green-soft border border-ff-green/20 px-2 py-0.5 rounded-full">Signed</span>
  if (status === 'sent') return <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Awaiting signature</span>
  return <span className="inline-flex items-center text-xs font-medium text-ink-3 bg-surface-2 border border-line px-2 py-0.5 rounded-full">Not sent</span>
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
  const [target, setTarget] = useState('')

  const sentIds = new Set(franchisorAgreements.map(a => a.franchisor_profiles.id))
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
      window.location.reload()
    } finally {
      setSending(null)
    }
  }

  return (
    <div>
      {/* Send a new agreement */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5 bg-surface border border-line rounded-2xl px-4 py-3 shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
        <span className="text-sm font-semibold text-ink">Send an agreement</span>
        <select value={target} onChange={e => setTarget(e.target.value)}
          className="text-sm border border-line rounded-lg px-2.5 py-2 bg-surface text-ink min-w-[200px] focus:outline-none focus:ring-2 focus:ring-ff-green/30">
          <option value="" disabled>Choose a brand…</option>
          {unsent.map(f => <option key={f.id} value={f.id}>{f.brand_name || f.profiles?.full_name || 'Unnamed'}</option>)}
        </select>
        <button onClick={() => target && sendAgreement(target)} disabled={!target || !hasTemplate || sending === target}
          className="bg-ff-green hover:brightness-110 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all disabled:opacity-50">
          {sending === target ? 'Sending…' : 'Send'}
        </button>
        {!hasTemplate && <span className="text-xs text-ff-gold-ink">Create a template first ↓</span>}
        {unsent.length === 0 && hasTemplate && <span className="text-xs text-ink-3">All brands have an agreement.</span>}
      </div>

      {/* Active agreements */}
      {franchisorAgreements.length === 0 ? (
        <div className="text-center py-12 text-ink-3 text-sm border border-line rounded-2xl bg-surface">
          No agreements sent yet — send one above, or from a brand&apos;s record.
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 border-b border-line">
                <tr className="text-ink-3 text-[11px] uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5 font-medium">Brand</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Sent</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Signed by</th>
                  <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-2">
                {franchisorAgreements.map(a => {
                  const fp = a.franchisor_profiles
                  const name = fp.brand_name || fp.profiles?.full_name || 'Unnamed'
                  return (
                    <tr key={a.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/admin/franchisors/${fp.id}`} className="font-medium text-ink hover:text-ff-green">{name}</Link>
                        <div className="text-xs text-ink-3 truncate">{fp.profiles?.email}</div>
                      </td>
                      <td className="px-4 py-3">{statusPill(a.status)}</td>
                      <td className="px-4 py-3 text-ink-2 whitespace-nowrap hidden sm:table-cell">{a.sent_at ? formatDate(a.sent_at) : '—'}</td>
                      <td className="px-4 py-3 text-ink-2 whitespace-nowrap hidden md:table-cell">{a.status === 'signed' ? `${a.signer_name ?? ''}${a.signed_at ? ` · ${timeAgo(a.signed_at)}` : ''}` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                          {a.status === 'signed' && a.signed_pdf_path && (
                            <a href={`/api/admin/agreements/download/${a.id}`} className="text-xs font-medium text-ff-green hover:underline">PDF</a>
                          )}
                          {a.status === 'sent' && (
                            <button onClick={() => sendAgreement(fp.id)} disabled={sending === fp.id} className="text-xs text-ink-2 hover:text-ink disabled:opacity-50">
                              {sending === fp.id ? 'Resending…' : 'Resend'}
                            </button>
                          )}
                          <Link href={`/admin/franchisors/${fp.id}`} className="text-xs font-medium text-ff-green hover:underline inline-flex items-center gap-0.5">
                            View <ArrowRightIcon className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
