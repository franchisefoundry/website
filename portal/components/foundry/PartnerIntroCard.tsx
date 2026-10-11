'use client'

import { useEffect, useState } from 'react'
import type { PlanContext } from '@/lib/foundry/types'
import { DealTag } from './bits'
import { useIntroList, type ListItem } from './IntroList'
import { IntroRequestDialog } from './IntroRequest'
import { beacon } from './client'

/** Logs one profile view per page load. */
export function ProfileView({ partnerId }: { partnerId: string }) {
  useEffect(() => { beacon('profile_view', partnerId) }, [partnerId])
  return null
}

export function PartnerIntroCard({ partner, dealTerms, replyHours, plan }: {
  partner: ListItem; dealTerms: string | null; replyHours: number | null; plan: PlanContext
}) {
  const list = useIntroList()
  const inList = list.has(partner.id)
  const [open, setOpen] = useState(false)
  const others = list.items.filter(i => i.id !== partner.id).length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-line bg-surface p-5">
        {partner.deal && (
          <>
            <div className="font-mono text-[11px] tracking-[0.1em] text-[#8a5f26]">MEMBER DEAL</div>
            <DealTag className="mt-2">{partner.deal}</DealTag>
            {dealTerms && <p className="mt-2 text-xs text-ink-3">{dealTerms}</p>}
          </>
        )}
        <button type="button" onClick={() => setOpen(true)}
          className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-ff-gold text-base font-bold text-ink hover:brightness-105">
          Request intro →
        </button>
        <button type="button" onClick={() => list.toggle(partner)} aria-pressed={inList}
          className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-ff-green text-sm font-bold text-ff-green hover:bg-surface-2">
          {inList ? '✓ In your intro list' : '+ Add to intro list'}
        </button>
        {others > 0 && (
          <p className="mt-2 text-center text-xs text-ink-2">
            {others} other partner{others === 1 ? '' : 's'} in your intro list
          </p>
        )}
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-2">
          We brief them on your plan first{replyHours ? `, and they usually reply within ${replyHours} hours` : ''}. All contact goes through us, so you’re covered.
        </p>
      </div>
      {open && (
        <IntroRequestDialog
          items={[partner]}
          plan={plan}
          off={[]}
          searchId={null}
          defaultNeed=""
          onClose={() => setOpen(false)}
          onSent={() => { if (inList) list.remove(partner.id) }}
        />
      )}
    </div>
  )
}
