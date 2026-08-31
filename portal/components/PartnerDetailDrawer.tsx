'use client'

import { useEffect, useState } from 'react'
import type { Partner } from '@/lib/supabase/types'
import { categoryMeta } from '@/lib/partner-categories'
import {
  CloseIcon, ShieldCheckIcon, TagIcon, CheckIcon,
  ExternalLinkIcon, ArrowRightIcon,
} from '@/components/icons'

interface Props {
  partner: Partner
  unlocked: boolean
  onClose: () => void
  onRequestIntro: () => void
}

export default function PartnerDetailDrawer({ partner: p, unlocked, onClose, onRequestIntro }: Props) {
  const meta = categoryMeta(p.category)
  const [shown, setShown] = useState(false)

  // Slide-in on mount; close on Escape.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const features = (p.features ?? []).filter(f => f.label?.trim() || f.value?.trim())

  return (
    <div className="fixed inset-0 z-50">
      {/* Scrim */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${p.name} details`}
        className={`absolute top-0 right-0 h-full w-full max-w-md bg-surface shadow-2xl flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none ${shown ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="relative bg-ff-green px-6 py-6 text-white flex-shrink-0">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-md p-1"
          >
            <CloseIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center flex-shrink-0 overflow-hidden">
              {p.logo_url
                ? <img src={p.logo_url} alt={p.name} className="w-full h-full object-contain p-1.5" />
                : <span className="text-ff-green text-xl font-bold">{p.name.charAt(0)}</span>}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight">{p.name}</h2>
              <p className="text-sm text-white/70 mt-0.5">
                {meta.label}{p.location ? ` · ${p.location}` : ''}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 mt-4 bg-ff-gold/25 text-ff-gold-light text-[11px] font-bold px-3 py-1 rounded-full">
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            Vetted by Franchise Foundry
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {p.description && (
            <section className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-2">About</h3>
              <p className="text-sm text-ink-2 leading-relaxed">{p.description}</p>
            </section>
          )}

          {features.length > 0 && (
            <section className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-3">What&apos;s included</h3>
              <ul className="space-y-2.5">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <CheckIcon className="w-4 h-4 text-ff-gold mt-0.5 flex-shrink-0" />
                    <span className="text-ink-2">
                      {f.label && <strong className="font-semibold text-ink">{f.label}</strong>}
                      {f.label && f.value && <span className="text-ink-3 mx-1.5">·</span>}
                      {f.value && <span>{f.value}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.offer_text && (
            <div className="bg-ff-gold-light/20 border border-dashed border-ff-gold rounded-xl px-4 py-3.5 mb-2">
              <p className="flex items-center gap-2 text-xs font-bold text-ink">
                <TagIcon className="w-4 h-4 text-ff-gold" />
                Foundry member deal
              </p>
              <p className="text-sm text-ink-2 mt-1.5 leading-relaxed">{p.offer_text}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-line px-6 py-4 flex gap-3">
          <button
            onClick={unlocked ? onRequestIntro : undefined}
            disabled={!unlocked}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ff-green ${
              unlocked
                ? 'bg-ff-green hover:bg-ff-green-deep text-white'
                : 'bg-surface-2 text-ink-3 cursor-not-allowed'
            }`}
          >
            {unlocked ? <>Request a warm intro <ArrowRightIcon className="w-4 h-4" /></> : 'Unlock to request intro'}
          </button>
          {p.website && (
            <a
              href={p.website.startsWith('http') ? p.website : `https://${p.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-3 px-4 text-sm font-medium text-ink-2 border border-line rounded-lg hover:border-ff-green hover:bg-surface-2 transition-colors"
            >
              <ExternalLinkIcon className="w-4 h-4" /> Visit
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
