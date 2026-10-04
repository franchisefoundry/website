'use client'

import { useMemo, useState } from 'react'
import type { Partner, PartnerCategory } from '@/lib/supabase/types'
import { PARTNER_CATEGORIES, categoryMeta } from '@/lib/partner-categories'
import PartnerDetailDrawer from './PartnerDetailDrawer'
import {
  SearchIcon, TagIcon, ArrowRightIcon, ShieldCheckIcon,
  MarketplaceIcon, ChevronDownIcon,
} from '@/components/icons'

type SortKey = 'recommended' | 'az'

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
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-line flex justify-between items-center">
          <h3 className="text-base font-bold text-ink">Request intro — {partner.name}</h3>
          <button onClick={onClose} className="text-ink-3 hover:text-ink-2 text-xl font-light leading-none">×</button>
        </div>

        {sent ? (
          <div className="px-6 py-8 text-center">
            <div className="text-4xl mb-4">✓</div>
            <p className="text-base font-semibold text-ink mb-2">Request sent!</p>
            <p className="text-sm text-ink-3 mb-6">We&apos;ll be in touch shortly to arrange your introduction to {partner.name}.</p>
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium bg-ff-green text-white rounded-lg hover:bg-ff-green-deep transition-colors">Done</button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-ink-2">
              We&apos;ll connect you directly with <strong>{partner.name}</strong>. Add a message so we can pass on any context before the intro.
            </p>
            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Message <span className="font-normal text-ink-3 normal-case">(optional)</span></label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder={`e.g. We're looking to finance a £250k franchise and need to understand what rates are available…`}
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm text-ink-2 border border-line rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
              <button onClick={submit} disabled={loading}
                className="flex-1 py-2.5 text-sm font-medium bg-ff-green hover:bg-ff-green-deep text-white rounded-lg transition-colors disabled:opacity-60">
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
  isAdmin?: boolean
  role: 'franchisee' | 'franchisor'
}

const PREVIEW_COUNT = 3

export default function MarketplaceView({ partners, unlocked: initialUnlocked, isAdmin = false, role }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PartnerCategory | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('recommended')
  const [introPartner, setIntroPartner] = useState<Partner | null>(null)
  const [detailPartner, setDetailPartner] = useState<Partner | null>(null)
  // Admin can toggle preview between locked/unlocked
  const [previewUnlocked, setPreviewUnlocked] = useState(initialUnlocked)
  const unlocked = isAdmin ? previewUnlocked : initialUnlocked

  // Categories actually present, with counts, in taxonomy order.
  const categoriesPresent = useMemo(() => {
    const counts = new Map<string, number>()
    partners.forEach(p => counts.set(p.category, (counts.get(p.category) ?? 0) + 1))
    return PARTNER_CATEGORIES
      .filter(c => counts.has(c.value))
      .map(c => ({ ...c, count: counts.get(c.value)! }))
  }, [partners])

  const dealCount = useMemo(() => partners.filter(p => p.offer_text?.trim()).length, [partners])

  // Search + category filter + sort.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = partners.filter(p => {
      if (filter !== 'all' && p.category !== filter) return false
      if (!q) return true
      const hay = [p.name, p.tagline, p.description, categoryMeta(p.category).label]
        .filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
    list = [...list].sort((a, b) =>
      sort === 'az'
        ? a.name.localeCompare(b.name)
        : a.display_order - b.display_order || a.name.localeCompare(b.name)
    )
    return list
  }, [partners, query, filter, sort])

  const isDefaultView = filter === 'all' && !query.trim()
  const deals = useMemo(() => filtered.filter(p => p.offer_text?.trim()), [filtered])

  // When locked, non-members see a taste, then a gate.
  const visible = unlocked ? filtered : filtered.slice(0, PREVIEW_COUNT)

  function openIntro(p: Partner) { setDetailPartner(null); setIntroPartner(p) }

  return (
    <>
      {/* Admin preview banner */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="text-amber-500 text-sm">👁</span>
            <p className="text-sm text-amber-800 font-medium">
              Admin preview — {role === 'franchisee' ? 'Franchisee' : 'Franchisor'} marketplace
            </p>
          </div>
          <button
            onClick={() => setPreviewUnlocked(v => !v)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              previewUnlocked
                ? 'bg-ff-green-soft text-white border-ff-green/20 hover:bg-ff-green-soft'
                : 'bg-surface text-ink-2 border-line hover:border-line'
            }`}
          >
            {previewUnlocked ? '🔓 Unlocked view' : '🔒 Locked view'}
          </button>
        </div>
      )}

      {/* Header + search */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight mb-1">Partner Marketplace</h1>
          <p className="text-ink-3 text-sm max-w-xl">
            Vetted partners to help you fund, launch and run your franchise — each negotiated by Franchise Foundry.
          </p>
        </div>
        <label className="flex items-center gap-2.5 bg-surface-2 border border-line rounded-xl px-3.5 py-2.5 w-full md:w-72 focus-within:ring-2 focus-within:ring-ff-green focus-within:border-ff-green transition-shadow">
          <SearchIcon className="w-4 h-4 text-ink-3 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search partners, e.g. “EPOS”"
            className="bg-transparent outline-none text-sm text-ink-2 placeholder:text-ink-3 w-full"
          />
        </label>
      </div>

      {/* Category rail */}
      {categoriesPresent.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryPill active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={partners.length} />
          {categoriesPresent.map(c => (
            <CategoryPill
              key={c.value}
              active={filter === c.value}
              onClick={() => setFilter(c.value)}
              label={c.label}
              count={c.count}
              icon={<c.Icon className="w-3.5 h-3.5" />}
            />
          ))}
        </div>
      )}

      {/* Count + sort */}
      <div className="flex items-center justify-between gap-3 mt-3 mb-6">
        <p className="text-xs text-ink-3">
          <span className="font-semibold text-ink">{filtered.length}</span> {filtered.length === 1 ? 'partner' : 'partners'}
          {isDefaultView && dealCount > 0 && (
            <> · <span className="font-semibold text-ink">{dealCount}</span> with Foundry deals</>
          )}
        </p>
        <label className="flex items-center gap-2 text-xs text-ink-2 border border-line rounded-lg pl-3 pr-2 py-1.5 bg-surface cursor-pointer hover:border-line transition-colors">
          <span className="text-ink-3">Sort</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="bg-transparent outline-none text-ink-2 font-medium cursor-pointer appearance-none pr-4"
          >
            <option value="recommended">Recommended</option>
            <option value="az">A–Z</option>
          </select>
          <ChevronDownIcon className="w-3.5 h-3.5 text-ink-3 -ml-4 pointer-events-none" />
        </label>
      </div>

      {partners.length === 0 ? (
        <EmptyState heading="No partners yet" body="Our marketplace is being built — check back soon for vetted partners and member-only deals." />
      ) : filtered.length === 0 ? (
        <EmptyState heading="No partners match" body="Try a different category or clear your search." />
      ) : (
        <>
          {/* Foundry deals — only on the default, unfiltered, unlocked view */}
          {unlocked && isDefaultView && deals.length > 0 && (
            <section className="mb-8">
              <SectionLabel>Foundry deals · exclusive to members</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {deals.map(p => (
                  <PartnerCard key={p.id} partner={p} unlocked={unlocked} featured onOpen={() => setDetailPartner(p)} onRequestIntro={() => openIntro(p)} />
                ))}
              </div>
            </section>
          )}

          {/* Main grid */}
          {unlocked && isDefaultView && deals.length > 0 && <SectionLabel>All partners</SectionLabel>}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {visible.map(p => (
              <PartnerCard
                key={p.id}
                partner={p}
                unlocked={unlocked}
                featured={!!p.offer_text?.trim()}
                onOpen={() => setDetailPartner(p)}
                onRequestIntro={() => openIntro(p)}
              />
            ))}
          </div>

          {/* Teaser gate for locked non-members */}
          {!unlocked && <UnlockGate hiddenCount={Math.max(filtered.length - visible.length, 0)} />}
        </>
      )}

      {/* Footer note */}
      {unlocked && partners.length > 0 && (
        <p className="mt-10 text-xs text-ink-3 text-center">
          All partners are vetted by Franchise Foundry. We may receive a referral fee, which never affects our recommendations.
        </p>
      )}

      {detailPartner && (
        <PartnerDetailDrawer
          partner={detailPartner}
          unlocked={unlocked}
          onClose={() => setDetailPartner(null)}
          onRequestIntro={() => openIntro(detailPartner)}
        />
      )}
      {introPartner && (
        <RequestIntroModal partner={introPartner} onClose={() => setIntroPartner(null)} />
      )}
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-3 whitespace-nowrap">{children}</h2>
      <div className="h-px bg-surface-2 flex-1" />
    </div>
  )
}

function CategoryPill({ active, onClick, label, count, icon }: {
  active: boolean; onClick: () => void; label: string; count: number; icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ff-green ${
        active
          ? 'bg-ff-green text-white border-ff-green'
          : 'bg-surface text-ink-2 border-line hover:border-ff-green'
      }`}
    >
      {icon && <span className={active ? 'text-white' : 'text-ink-3'}>{icon}</span>}
      {label}
      <span className={`text-[11px] tabular-nums rounded-full px-1.5 ${active ? 'bg-surface/20 text-white' : 'bg-surface-2 text-ink-3'}`}>{count}</span>
    </button>
  )
}

function EmptyState({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-4">
        <MarketplaceIcon className="w-6 h-6 text-ink-3" />
      </div>
      <p className="text-sm font-semibold text-ink-2 mb-1">{heading}</p>
      <p className="text-xs text-ink-3 leading-relaxed max-w-xs">{body}</p>
    </div>
  )
}

function UnlockGate({ hiddenCount }: { hiddenCount: number }) {
  return (
    <div className="mt-6 bg-gradient-to-b from-surface to-surface-2 border border-line rounded-2xl p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-ff-green/10 flex items-center justify-center mx-auto mb-4">
        <ShieldCheckIcon className="w-7 h-7 text-ff-green" />
      </div>
      <h3 className="text-base font-bold text-ink mb-2">Unlock the full marketplace</h3>
      <p className="text-sm text-ink-3 mb-5 leading-relaxed max-w-sm mx-auto">
        {hiddenCount > 0
          ? `You're previewing ${hiddenCount === 1 ? 'part of' : `${hiddenCount} more of`} our vetted partners. Membership unlocks every partner and exclusive Foundry-negotiated deals.`
          : 'Membership unlocks warm introductions and exclusive Foundry-negotiated deals from every partner.'}
      </p>
      <a
        href="mailto:connect@franchisefoundry.co.uk?subject=Marketplace access"
        className="inline-block py-2.5 px-6 text-sm font-medium bg-ff-green hover:bg-ff-green-deep text-white rounded-lg transition-colors"
      >
        Contact us to unlock
      </a>
      <p className="text-xs text-ink-3 mt-3">connect@franchisefoundry.co.uk</p>
    </div>
  )
}

function PartnerCard({ partner: p, unlocked, featured, onOpen, onRequestIntro }: {
  partner: Partner
  unlocked: boolean
  featured?: boolean
  onOpen: () => void
  onRequestIntro: () => void
}) {
  const meta = categoryMeta(p.category)

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className={`bg-surface rounded-xl border shadow-sm hover:shadow-md hover:border-line transition-all flex flex-col overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ff-green ${
        featured ? 'border-ff-gold-light' : 'border-line'
      }`}
    >
      {featured && <div className="h-[3px] bg-gradient-to-r from-ff-gold to-ff-gold-light flex-shrink-0" />}

      {/* Header */}
      <div className="p-5 flex items-start gap-4 border-b border-line-2">
        <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {p.logo_url
            ? <img src={p.logo_url} alt={p.name} className="w-full h-full object-contain" />
            : <span className="text-ink-3 text-lg font-bold">{p.name.charAt(0)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink text-sm leading-tight">{p.name}</p>
          {p.tagline && <p className="text-xs text-ink-3 mt-0.5 line-clamp-2">{p.tagline}</p>}
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.pill}`}>
          <meta.Icon className="w-3 h-3" />
          {meta.short}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        {p.description && (
          <p className="text-sm text-ink-2 leading-relaxed mb-4 line-clamp-3">{p.description}</p>
        )}

        {p.offer_text?.trim() && (
          <div className="flex items-start gap-2 bg-ff-gold-light/20 border border-dashed border-ff-gold rounded-lg px-3 py-2 mb-4">
            <TagIcon className="w-3.5 h-3.5 text-ff-gold mt-0.5 flex-shrink-0" />
            <span className="text-xs font-semibold text-ink leading-snug">{p.offer_text}</span>
          </div>
        )}

        {p.features && p.features.length > 0 && (
          <ul className="space-y-2 mb-5">
            {p.features.slice(0, 3).map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-ff-gold mt-0.5 flex-shrink-0">✦</span>
                <span>
                  {f.label && <strong className="font-semibold text-ink">{f.label}</strong>}
                  {f.label && f.value && <span className="text-ink-3 mx-1">·</span>}
                  {f.value && <span className="text-ink-2">{f.value}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={unlocked ? onRequestIntro : undefined}
            disabled={!unlocked}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              unlocked
                ? 'bg-ff-green hover:bg-ff-green-deep text-white'
                : 'bg-surface-2 text-ink-3 cursor-not-allowed'
            }`}
          >
            {unlocked ? <>Request intro <ArrowRightIcon className="w-3.5 h-3.5" /></> : '🔒 Unlock'}
          </button>
          <button
            onClick={onOpen}
            className="py-2.5 px-4 text-sm font-medium text-ink-2 border border-line rounded-lg hover:border-ff-green hover:bg-surface-2 transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}
