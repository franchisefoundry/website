'use client'

import { useState } from 'react'
import type { Partner, PartnerSector } from '@/lib/supabase/types'

const SECTOR_LABELS: Record<PartnerSector | 'all', string> = {
  all:      'All',
  finance:  'Finance',
  property: 'Property',
  tech:     'Tech',
  legal:    'Legal',
  other:    'Other',
}

const SECTOR_ICONS: Record<PartnerSector | 'all', string> = {
  all:      '◈',
  finance:  '£',
  property: '⌂',
  tech:     '⚙',
  legal:    '⚖',
  other:    '◎',
}

interface RequestIntroModalProps {
  partner: Partner
  onClose: () => void
}

function RequestIntroModal({ partner, onClose }: RequestIntroModalProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/intro-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner_id: partner.id, message }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
    setSent(true)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900">Request intro — {partner.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-light leading-none">×</button>
        </div>

        {sent ? (
          <div className="px-6 py-8 text-center">
            <div className="text-4xl mb-4">✓</div>
            <p className="text-base font-semibold text-slate-900 mb-2">Request sent!</p>
            <p className="text-sm text-slate-500 mb-6">We&apos;ll be in touch shortly to arrange your introduction to {partner.name}.</p>
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors">Done</button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-slate-600">
              We&apos;ll connect you directly with <strong>{partner.name}</strong>. Add a message so we can pass on any context before the intro.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Message <span className="font-normal text-slate-400 normal-case">(optional)</span></label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder={`e.g. We're looking to finance a £250k franchise and need to understand what rates are available…`}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={submit} disabled={loading}
                className="flex-1 py-2.5 text-sm font-medium bg-brand-green hover:bg-brand-green-dark text-white rounded-lg transition-colors disabled:opacity-60">
                {loading ? 'Sending…' : 'Request intro'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  partners: Partner[]
  unlocked: boolean
  role: 'franchisee' | 'franchisor'
}

export default function MarketplaceView({ partners, unlocked, role }: Props) {
  const [filter, setFilter] = useState<PartnerSector | 'all'>('all')
  const [introPartner, setIntroPartner] = useState<Partner | null>(null)

  const sectors = ['all', ...Array.from(new Set(partners.map(p => p.sector)))] as (PartnerSector | 'all')[]
  const filtered = filter === 'all' ? partners : partners.filter(p => p.sector === filter)

  return (
    <>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Partner Marketplace</h1>
        <p className="text-slate-500 text-sm">
          Trusted partners across finance, property, tech and more — each vetted and negotiated by Franchise Foundry.
        </p>
      </div>

      {/* Filter pills */}
      {sectors.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {sectors.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === s
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-brand-green'
              }`}
            >
              <span className="text-xs opacity-70">{SECTOR_ICONS[s]}</span>
              {SECTOR_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {/* Partner grid — blurred when locked */}
      <div className="relative">
        {!unlocked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center" style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', background: 'rgba(255,255,255,0.6)', borderRadius: 16 }}>
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center max-w-sm mx-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Marketplace locked</h3>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                Access to our partner marketplace is included in the Franchise Foundry membership. Contact us to unlock exclusive deals from our trusted partners.
              </p>
              <a
                href="mailto:connect@franchisefoundry.co.uk?subject=Marketplace access"
                className="inline-block w-full py-2.5 text-sm font-medium bg-brand-green hover:bg-brand-green-dark text-white rounded-lg transition-colors text-center"
              >
                Contact us to unlock
              </a>
              <p className="text-xs text-slate-400 mt-3">connect@franchisefoundry.co.uk</p>
            </div>
          </div>
        )}

        {partners.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400 text-sm">No partners available yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(p => (
              <PartnerCard
                key={p.id}
                partner={p}
                unlocked={unlocked}
                onRequestIntro={() => setIntroPartner(p)}
              />
            ))}
          </div>
        )}
      </div>

      {introPartner && (
        <RequestIntroModal partner={introPartner} onClose={() => setIntroPartner(null)} />
      )}

      {/* Empty filter state */}
      {filtered.length === 0 && partners.length > 0 && (
        <p className="text-center text-slate-400 text-sm mt-8">No partners in this category yet.</p>
      )}

      {/* Footer note */}
      {unlocked && (
        <p className="mt-10 text-xs text-slate-400 text-center">
          All partners are vetted by Franchise Foundry. We may receive a referral fee, which never affects our recommendations.
        </p>
      )}
    </>
  )
}

function PartnerCard({
  partner: p,
  unlocked,
  onRequestIntro,
}: {
  partner: Partner
  unlocked: boolean
  onRequestIntro: () => void
}) {
  const sectorColour: Record<string, string> = {
    finance:  'bg-blue-50 text-blue-700',
    property: 'bg-amber-50 text-amber-700',
    tech:     'bg-violet-50 text-violet-700',
    legal:    'bg-slate-100 text-slate-600',
    other:    'bg-green-50 text-green-700',
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col">
      {/* Card header */}
      <div className="p-5 flex items-start gap-4 border-b border-slate-100">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {p.logo_url
            ? <img src={p.logo_url} alt={p.name} className="w-full h-full object-contain" />
            : <span className="text-slate-400 text-lg font-bold">{p.name.charAt(0)}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm leading-tight">{p.name}</p>
          {p.tagline && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{p.tagline}</p>}
        </div>
        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${sectorColour[p.sector] ?? 'bg-slate-100 text-slate-600'}`}>
          {SECTOR_LABELS[p.sector]}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        {p.description && (
          <p className="text-sm text-slate-600 leading-relaxed mb-4">{p.description}</p>
        )}

        {p.features && p.features.length > 0 && (
          <ul className="space-y-2 mb-5">
            {p.features.slice(0, 4).map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-brand-gold mt-0.5 flex-shrink-0">✦</span>
                <span>
                  {f.label && <strong className="font-semibold text-slate-800">{f.label}</strong>}
                  {f.label && f.value && <span className="text-slate-400 mx-1">·</span>}
                  {f.value && <span className="text-slate-600">{f.value}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto">
          <button
            onClick={unlocked ? onRequestIntro : undefined}
            disabled={!unlocked}
            className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${
              unlocked
                ? 'bg-brand-green hover:bg-brand-green-dark text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {unlocked ? 'Request intro →' : '🔒 Unlock to request intro'}
          </button>
        </div>
      </div>
    </div>
  )
}
