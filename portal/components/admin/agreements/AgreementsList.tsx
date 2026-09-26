'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate, timeAgo } from '@/lib/utils'
import { ArrowRightIcon, MessageIcon } from '@/components/icons'

export interface AgreementRow {
  id: string
  brandId: string
  brandName: string
  email: string | null
  status: string
  sent_at: string | null
  signed_at: string | null
  signer_name: string | null
  signed_pdf_path: string | null
  openComments: number
}

function Row({ a, mode }: { a: AgreementRow; mode: 'active' | 'archive' }) {
  const [resending, setResending] = useState(false)
  async function resend() {
    setResending(true)
    try {
      const res = await fetch('/api/admin/agreements/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ franchisorProfileId: a.brandId }) })
      if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Failed'); return }
      window.location.reload()
    } finally { setResending(false) }
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-line-2 last:border-b-0 hover:bg-surface-2/60 transition-colors">
      <div className="min-w-0 flex-1">
        <Link href={`/admin/franchisors/${a.brandId}`} className="text-sm font-semibold text-ink hover:text-ff-green">{a.brandName}</Link>
        <p className="text-xs text-ink-3 truncate">
          {mode === 'archive'
            ? `Signed by ${a.signer_name ?? '—'}${a.signed_at ? ` · ${timeAgo(a.signed_at)}` : ''}`
            : `Sent ${a.sent_at ? formatDate(a.sent_at) : '—'}`}
        </p>
      </div>
      {mode === 'active' && a.openComments > 0 && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ff-gold-ink bg-ff-gold-soft border border-[#e6cfa6] rounded-full px-2 py-0.5 flex-shrink-0">
          <MessageIcon className="w-3 h-3" /> {a.openComments} to address
        </span>
      )}
      <div className="flex items-center gap-3 flex-shrink-0">
        {mode === 'archive' && a.signed_pdf_path && (
          <a href={`/api/admin/agreements/download/${a.id}`} className="text-xs font-medium text-ff-green hover:underline">PDF</a>
        )}
        {mode === 'active' && (
          <button onClick={resend} disabled={resending} className="text-xs text-ink-2 hover:text-ink disabled:opacity-50">{resending ? 'Resending…' : 'Resend'}</button>
        )}
        <Link href={`/admin/franchisors/${a.brandId}`} className="text-xs font-medium text-ff-green hover:underline inline-flex items-center gap-0.5">View <ArrowRightIcon className="w-3 h-3" /></Link>
      </div>
    </div>
  )
}

function Group({ label, rows, mode }: { label: string; rows: AgreementRow[]; mode: 'active' | 'archive' }) {
  if (rows.length === 0) return null
  return (
    <div className="mb-6 last:mb-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3 mb-2">{label} ({rows.length})</p>
      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
        {rows.map(a => <Row key={a.id} a={a} mode={mode} />)}
      </div>
    </div>
  )
}

export function AgreementsList({ agreements, mode }: { agreements: AgreementRow[]; mode: 'active' | 'archive' }) {
  if (mode === 'archive') {
    const signed = agreements.filter(a => a.status === 'signed')
    if (signed.length === 0) return <div className="text-center py-12 text-ink-3 text-sm border border-line rounded-2xl bg-surface">No signed agreements yet.</div>
    return <Group label="Signed & executed" rows={signed} mode="archive" />
  }

  const active = agreements.filter(a => a.status !== 'signed')
  const needsReply = active.filter(a => a.openComments > 0)
  const awaiting = active.filter(a => a.openComments === 0)
  if (active.length === 0) return <div className="text-center py-12 text-ink-3 text-sm border border-line rounded-2xl bg-surface">Nothing out for signature. Send one from the Send tab.</div>

  return (
    <div>
      <Group label="Needs your reply" rows={needsReply} mode="active" />
      <Group label="Awaiting signature" rows={awaiting} mode="active" />
    </div>
  )
}
