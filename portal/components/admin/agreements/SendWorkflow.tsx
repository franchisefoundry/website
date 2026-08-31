'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckIcon, ArrowRightIcon, SearchIcon } from '@/components/icons'

export interface SendableBrand {
  id: string
  name: string
  email: string | null
  hasAgreement: boolean
}

const STEPS = ['Choose brand', 'Confirm template', 'Send'] as const

/** Guided workflow for sending a franchise agreement to a brand. */
export function SendWorkflow({ brands, templateTitle, templateVersion, hasTemplate }: {
  brands: SendableBrand[]
  templateTitle: string
  templateVersion: number
  hasTemplate: boolean
}) {
  const [step, setStep] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const selected = brands.find(b => b.id === selectedId) ?? null
  const filtered = brands.filter(b => !search.trim() || b.name.toLowerCase().includes(search.toLowerCase()) || (b.email ?? '').toLowerCase().includes(search.toLowerCase()))

  async function send() {
    if (!selectedId) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/agreements/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ franchisorProfileId: selectedId }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d.error ?? 'Failed to send'); return }
      setDone(true)
    } finally {
      setSending(false)
    }
  }

  if (!hasTemplate) {
    return (
      <div className="bg-ff-gold-soft border border-[#e6cfa6] rounded-2xl px-5 py-4 text-sm text-ff-gold-ink">
        Create a master agreement in the <span className="font-semibold">Templates</span> tab before sending.
      </div>
    )
  }

  if (done && selected) {
    return (
      <div className="bg-surface border border-line rounded-2xl p-8 text-center shadow-[0_1px_2px_rgba(27,33,26,0.05)] max-w-xl">
        <div className="w-12 h-12 rounded-full bg-ff-green/10 text-ff-green flex items-center justify-center mx-auto mb-4"><CheckIcon className="w-6 h-6" /></div>
        <p className="text-base font-bold text-ink">Agreement sent to {selected.name}</p>
        <p className="text-sm text-ink-2 mt-1 max-w-sm mx-auto">They&apos;ll be notified to review, comment on and e-sign {templateTitle} (v{templateVersion}). Track it in the Active tab.</p>
        <button onClick={() => { setDone(false); setStep(0); setSelectedId(null); setSearch('') }} className="mt-5 text-sm font-medium text-ff-green hover:underline">Send another →</button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Stepper */}
      <ol className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={cn('flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 text-xs font-medium whitespace-nowrap',
              i === step ? 'bg-ff-green text-white' : i < step ? 'bg-ff-green/10 text-ff-green' : 'bg-surface-2 text-ink-3')}>
              <span className={cn('w-5 h-5 rounded-full grid place-items-center text-[10px]', i === step ? 'bg-white/25' : i < step ? 'bg-ff-green text-white' : 'bg-line text-ink-3')}>
                {i < step ? <CheckIcon className="w-3 h-3" /> : i + 1}
              </span>
              {s}
            </div>
            {i < STEPS.length - 1 && <span className={cn('h-px flex-1', i < step ? 'bg-ff-green/40' : 'bg-line')} />}
          </li>
        ))}
      </ol>

      <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-5">
        {step === 0 && (
          <div>
            <h3 className="text-base font-bold text-ink mb-1">Which brand is this for?</h3>
            <p className="text-xs text-ink-2 mb-4">Choose the brand to send the franchise agreement to.</p>
            <div className="flex items-center gap-2 bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-3 mb-3">
              <SearchIcon className="w-4 h-4 flex-shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search brands…" className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-3" />
            </div>
            <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-ink-3 text-center py-6">No brands match.</p>
              ) : filtered.map(b => (
                <button key={b.id} type="button" onClick={() => setSelectedId(b.id)}
                  className={cn('w-full flex items-center justify-between gap-3 text-left rounded-xl px-3 py-2.5 border transition-colors',
                    selectedId === b.id ? 'border-ff-green bg-ff-green/[0.06]' : 'border-line hover:bg-surface-2')}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{b.name}</p>
                    <p className="text-xs text-ink-3 truncate">{b.email}</p>
                  </div>
                  {b.hasAgreement && <span className="text-[10px] font-medium text-ink-3 bg-surface-2 border border-line rounded-full px-2 py-0.5 flex-shrink-0">Already has one</span>}
                  {selectedId === b.id && <span className="w-5 h-5 rounded-full bg-ff-green text-white grid place-items-center flex-shrink-0"><CheckIcon className="w-3 h-3" /></span>}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button disabled={!selectedId} onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 bg-ff-green text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50 hover:brightness-110 transition-all">Continue <ArrowRightIcon className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {step === 1 && selected && (
          <div>
            <h3 className="text-base font-bold text-ink mb-1">Confirm and send</h3>
            <p className="text-xs text-ink-2 mb-4">Review before sending. {selected.name} will be able to read, comment on and e-sign it.</p>
            <dl className="rounded-xl border border-line divide-y divide-line-2 mb-4">
              <div className="flex justify-between px-4 py-3 text-sm"><dt className="text-ink-3">Brand</dt><dd className="font-medium text-ink">{selected.name}</dd></div>
              <div className="flex justify-between px-4 py-3 text-sm"><dt className="text-ink-3">Recipient</dt><dd className="font-medium text-ink">{selected.email ?? '—'}</dd></div>
              <div className="flex justify-between px-4 py-3 text-sm"><dt className="text-ink-3">Document</dt><dd className="font-medium text-ink">{templateTitle} · v{templateVersion}</dd></div>
            </dl>
            {selected.hasAgreement && <p className="text-xs text-ff-gold-ink bg-ff-gold-soft border border-[#e6cfa6] rounded-lg px-3 py-2 mb-4">This brand already has an agreement on file — sending will re-issue the current template version.</p>}
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(0)} className="text-sm font-medium text-ink-2 hover:text-ink">‹ Back</button>
              <button disabled={sending} onClick={send} className="inline-flex items-center gap-1.5 bg-ff-green text-white text-sm font-medium px-5 py-2 rounded-xl disabled:opacity-50 hover:brightness-110 transition-all">{sending ? 'Sending…' : 'Send agreement'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
