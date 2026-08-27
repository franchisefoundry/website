'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Drawer } from '@/components/ui/drawer'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { MessageIcon } from '@/components/icons'

export interface Candidate {
  id: string
  status: string
  stageIndex: number
  score: number
  scoreLabel: string
  scoreClass: string
  budget: string
  liquidCapital: string
  timeline: string
  operator: string
  experience: string
  fullTime: string
  locations: string[]
  reasons: string[]
  goals: string | null
  displayName: string | null
  displayCity: string | null
}

const PIPE = ['Matched', 'Interested', 'Intro', 'Meeting', 'Agreement']

function Group({ dot, label, children }: { dot: string; label: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: dot }} />{label}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

export function CandidatesView({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'needs' | 'progress' | 'all'>('needs')
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [shortlist, setShortlist] = useState<Set<string>>(new Set())

  const needs = candidates.filter(c => c.status === 'suggested' || c.status === 'shown')
  const progress = candidates.filter(c => c.status === 'interested' || c.status === 'intro_made')

  const shown = filter === 'needs' ? needs : filter === 'progress' ? progress : candidates
  const open = candidates.find(c => c.id === openId) ?? null

  async function respond(id: string, action: 'interested' | 'pass') {
    setBusy(action)
    const res = await fetch(`/api/franchisor/matches/${id}/respond`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    setBusy(null)
    if (res.ok) {
      toast(action === 'interested' ? 'Interest noted — your consultant will be in touch' : 'Candidate passed')
      setOpenId(null)
      router.refresh()
    } else {
      toast('Something went wrong. Please try again.', 'error')
    }
  }

  const seg = (id: typeof filter, label: string, n: number) => (
    <button onClick={() => setFilter(id)}
      className={cn('px-3.5 py-2 rounded-lg text-sm font-medium transition-colors', filter === id ? 'bg-ff-green text-white' : 'text-ink-2 hover:text-ink')}>
      {label}{n > 0 && <span className={cn('ml-1.5 text-[11px] rounded-full px-1.5 tabular-nums', filter === id ? 'bg-white/20' : 'bg-surface-2')}>{n}</span>}
    </button>
  )

  const Card = ({ c }: { c: Candidate }) => (
    <button onClick={() => setOpenId(c.id)}
      className="w-full text-left bg-surface border border-line rounded-2xl p-4 shadow-[0_1px_2px_rgba(27,33,26,0.04)] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(27,33,26,0.08)] hover:border-[#d6dace] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{c.displayName ? `${c.displayName}${c.displayCity ? `, ${c.displayCity}` : ''}` : 'Confidential candidate'}</p>
          <p className="text-xs text-ink-3 mt-0.5">{c.displayName ? 'Identity revealed' : 'Confidential until introduction'}</p>
        </div>
        {c.score > 0 && <span className={cn('text-sm font-bold px-2.5 py-1 rounded-full flex-shrink-0', c.scoreClass)}>{c.score}%</span>}
      </div>
      <div className="flex gap-x-5 gap-y-1 flex-wrap mt-3">
        {[['Budget', c.budget], ['Timeline', c.timeline], ['Operator', c.operator]].map(([k, v]) => (
          <div key={k}><span className="text-[10px] text-ink-3 block">{k}</span><span className="text-xs font-semibold">{v}</span></div>
        ))}
      </div>
      {c.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {c.reasons.slice(0, 4).map((r, i) => <span key={i} className="text-[10.5px] font-medium text-ff-green bg-ff-green/10 rounded-full px-2 py-0.5">✓ {r}</span>)}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-line-2 flex items-center justify-between">
        <span className="text-xs text-ink-3">{c.stageIndex >= 2 ? `🤝 ${PIPE[c.stageIndex]}` : PIPE[c.stageIndex]}</span>
        <span className="text-xs font-semibold text-ff-green">{c.stageIndex >= 2 ? 'Open →' : 'Review candidate →'}</span>
      </div>
    </button>
  )

  return (
    <>
      <div className="inline-flex bg-surface border border-line rounded-xl p-1 gap-1 mb-5">
        {seg('needs', 'Needs review', needs.length)}
        {seg('progress', 'In progress', progress.length)}
        {seg('all', 'All', candidates.length)}
      </div>

      {shown.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center text-sm text-ink-3">
          {filter === 'needs' ? 'Nothing to review right now — you’re all caught up.' : 'No candidates here yet.'}
        </div>
      ) : filter === 'all' ? (
        <>
          {needs.length > 0 && <Group dot="#2563eb" label={`Needs your review (${needs.length})`}>{needs.map(c => <Card key={c.id} c={c} />)}</Group>}
          {progress.length > 0 && <Group dot="var(--ff-ok)" label={`In progress (${progress.length})`}>{progress.map(c => <Card key={c.id} c={c} />)}</Group>}
        </>
      ) : (
        <div className="space-y-2.5">{shown.map(c => <Card key={c.id} c={c} />)}</div>
      )}

      {/* Review slide-over */}
      <Drawer open={!!open} onClose={() => setOpenId(null)} size="md" ariaLabel="Candidate review">
        {open && (
          <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-line-2 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-ink">{open.displayName ? `${open.displayName}${open.displayCity ? `, ${open.displayCity}` : ''}` : 'Confidential candidate'}</h2>
                <p className="text-xs text-ink-3 mt-0.5">{open.score}% fit · {open.scoreLabel}{open.displayName ? '' : ' · confidential until introduction'}</p>
              </div>
              <button onClick={() => setOpenId(null)} aria-label="Close" className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2">✕</button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
              {/* pipeline */}
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-2.5">Where they are</p>
              <div className="flex items-center gap-1 mb-1.5">
                {PIPE.map((_, i) => (
                  <div key={i} className={cn('flex-1 h-1.5 rounded-full', i < open.stageIndex ? 'bg-ff-green' : i === open.stageIndex ? 'bg-ff-gold' : 'bg-line')} />
                ))}
              </div>
              <div className="flex gap-1 mb-6">
                {PIPE.map((l, i) => <span key={i} className={cn('flex-1 text-center text-[9.5px]', i === open.stageIndex ? 'text-ff-gold-ink font-bold' : 'text-ink-3')}>{l}</span>)}
              </div>

              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-3">Qualification</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-sm mb-6">
                {[['Investment budget', open.budget], ['Liquid capital', open.liquidCapital], ['Timeline to open', open.timeline], ['Operator model', open.operator], ['Experience', open.experience], ['Full-time', open.fullTime]].map(([k, v]) => (
                  <div key={k}><dt className="text-ink-3 text-xs mb-0.5">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>
                ))}
              </dl>

              {open.reasons.length > 0 && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-2.5">Why they match</p>
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {open.reasons.map((r, i) => <span key={i} className="text-xs font-medium text-ff-green bg-ff-green/10 rounded-full px-2.5 py-1">✓ {r}</span>)}
                  </div>
                </>
              )}

              {open.goals && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-2.5">Their goals</p>
                  <div className="bg-surface-2 rounded-xl p-3.5 text-sm text-ink-2 leading-relaxed">{open.goals}</div>
                </>
              )}
            </div>

            {/* actions */}
            <div className="flex-shrink-0 border-t border-line-2 bg-surface-2 px-6 py-4 space-y-2.5">
              {open.status === 'suggested' || open.status === 'shown' ? (
                <>
                  <div className="flex gap-2.5">
                    <button onClick={() => respond(open.id, 'interested')} disabled={!!busy}
                      className="flex-1 bg-ff-green text-white text-sm font-semibold py-2.5 rounded-xl hover:brightness-110 transition-all disabled:opacity-60">
                      {busy === 'interested' ? '…' : '👍 Express interest'}
                    </button>
                    <Link href="/franchisor/messages" className="inline-flex items-center gap-1.5 border border-line bg-surface text-ink-2 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-surface-2 transition-colors">
                      <MessageIcon className="w-4 h-4" /> Ask
                    </Link>
                  </div>
                  <div className="flex gap-2.5">
                    <button onClick={() => respond(open.id, 'pass')} disabled={!!busy}
                      className="flex-1 border border-line bg-surface text-red-600 text-sm font-medium py-2.5 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-60">
                      Not the right fit
                    </button>
                    <button onClick={() => setShortlist(s => { const n = new Set(s); n.has(open.id) ? n.delete(open.id) : n.add(open.id); return n })}
                      className="flex-1 border border-line bg-surface text-ink-2 text-sm font-medium py-2.5 rounded-xl hover:bg-surface-2 transition-colors">
                      {shortlist.has(open.id) ? '★ Shortlisted' : '☆ Shortlist'}
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-3 text-center">Express interest and we arrange a warm introduction — you’ll never chase.</p>
                </>
              ) : open.status === 'interested' ? (
                <p className="text-sm text-ff-green font-medium text-center py-1">✓ Interest noted — your consultant will be in touch to arrange the introduction.</p>
              ) : (
                <div className="flex gap-2.5">
                  <Link href="/franchisor/messages" className="flex-1 text-center bg-ff-green text-white text-sm font-semibold py-2.5 rounded-xl hover:brightness-110 transition-all">Message candidate</Link>
                  <Link href="/franchisor/meetings" className="flex-1 text-center border border-line bg-surface text-ink-2 text-sm font-medium py-2.5 rounded-xl hover:bg-surface-2 transition-colors">Book meeting</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
