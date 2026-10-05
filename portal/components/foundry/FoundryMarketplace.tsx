'use client'

import { useMemo, useState } from 'react'
import type { Partner } from '@/lib/supabase/types'
import { PARTNER_CATEGORIES, categoryMeta } from '@/lib/partner-categories'
import { runConcierge, forgedForYou, type ConciergeContext, type ConciergeMatch } from '@/lib/foundry/concierge'

interface Props {
  partners: Partner[]
  context: ConciergeContext
  stats: { partners: number; deals: number; categories: number }
}

const EXAMPLES = [
  'Find funding to open two more sites',
  'Suppliers top brands trust',
  'A marketing partner for a local launch',
  'Help with my franchise agreement',
]

/** Molten-gold + forge-green hero, built with inline styles so it renders
 *  independent of Tailwind soft-token availability. */
const HERO_BG =
  'radial-gradient(520px 260px at 85% -10%, rgba(224,173,104,0.55), transparent 68%),' +
  'radial-gradient(420px 300px at 6% 6%, rgba(124,92,255,0.12), transparent 60%),' +
  'linear-gradient(158deg, #1f2f1c 0%, #2f4332 58%, #38502c 100%)'

export default function FoundryMarketplace({ partners, context, stats }: Props) {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [introFor, setIntroFor] = useState<Partner | null>(null)

  const results = useMemo(
    () => (submitted ? runConcierge(submitted, partners, context) : []),
    [submitted, partners, context],
  )
  const featured = useMemo(() => forgedForYou(partners, context), [partners, context])

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    partners.forEach(p => { if (p.is_active) m[p.category] = (m[p.category] ?? 0) + 1 })
    return m
  }, [partners])

  function ask(q: string) {
    setQuery(q)
    setSubmitted(q.trim() || null)
  }

  return (
    <div className="-mt-2">
      {/* ── Hero: the concierge ─────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden text-[#eef3ec] relative" style={{ background: HERO_BG }}>
        <div className="p-6 sm:p-9">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase flex items-center gap-2" style={{ color: '#eac98d' }}>
            <span className="w-5 h-5 rounded-md grid place-items-center text-[12px] text-[#2b241a]" style={{ background: 'linear-gradient(135deg,#f0cd8f,#c8924a)' }}>✦</span>
            The Foundry · concierge
          </p>
          <h1 className="font-extrabold tracking-[-0.03em] leading-[1.03] mt-4 max-w-[16ch]" style={{ fontSize: 'clamp(26px,4.5vw,44px)', color: '#f6f3ea' }}>
            {context.brandName ? `What does ${firstName(context.brandName)} need next?` : 'What does your franchise need next?'}
          </h1>
          <p className="mt-3 text-[15px] max-w-[48ch]" style={{ color: '#c6d3c4' }}>
            Ask in plain words. The Foundry reads the network and forges the right
            introductions — vetted, and warm. <span style={{ color: '#e9c78b' }}>Introduced, not advertised.</span>
          </p>

          {/* ask bar */}
          <form
            className="mt-6 max-w-[640px] flex items-center gap-2.5 rounded-2xl p-2 pl-4"
            style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(224,173,104,0.5)', boxShadow: '0 0 0 4px rgba(224,173,104,0.10)' }}
            onSubmit={e => { e.preventDefault(); ask(query) }}
          >
            <span className="text-[15px]" style={{ color: '#e9c78b' }}>⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Describe what you're looking for…"
              className="flex-1 bg-transparent outline-none text-[15px] py-2"
              style={{ color: '#f0f4ee' }}
            />
            {submitted && (
              <button type="button" onClick={() => ask('')} className="text-[12px] px-2" style={{ color: '#9fb3a3' }}>Clear</button>
            )}
            <button type="submit" className="font-bold text-[13px] text-[#2b241a] rounded-xl px-4 py-2.5" style={{ background: 'linear-gradient(135deg,#f0cd8f,#c8924a)' }}>
              Ask →
            </button>
          </form>

          {/* example chips */}
          <div className="mt-3.5 flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => ask(ex)}
                className="text-[12.5px] rounded-full px-3 py-1.5 transition-colors"
                style={{ color: '#d7e0d2', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)' }}
              >
                <span style={{ color: '#eac98d' }}>try</span>&nbsp; {ex}
              </button>
            ))}
          </div>

          {/* stats */}
          <div className="mt-7 pt-5 flex flex-wrap gap-x-8 gap-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <Stat n={stats.partners} label="vetted partners" />
            <Stat n={stats.deals} label="Foundry deals" />
            <Stat n={stats.categories} label="categories" />
          </div>
        </div>
      </div>

      {/* ── Results, or Forged-for-you ──────────────────────────────── */}
      <section className="mt-6">
        {submitted ? (
          <>
            <ResultHeader label={`The Foundry found ${results.length} ${results.length === 1 ? 'introduction' : 'introductions'} worth making`} sub="Reasoned from your request and the live, vetted network — ranked by fit, not by who paid." />
            <div className="space-y-3 mt-4">
              {results.length === 0 && (
                <p className="text-ink-3 text-sm bg-surface border border-line rounded-2xl p-6 text-center">
                  Nothing matched that yet — try one of the examples, or browse by category below.
                </p>
              )}
              {results.map(m => <MatchCard key={m.partner.id} match={m} onIntro={() => setIntroFor(m.partner)} />)}
            </div>
          </>
        ) : (
          <>
            <ResultHeader label="Forged for you" sub="A head start while you think — popular across the network, deals first." />
            <div className="space-y-3 mt-4">
              {featured.map(m => <MatchCard key={m.partner.id} match={m} onIntro={() => setIntroFor(m.partner)} />)}
            </div>
          </>
        )}
      </section>

      {/* ── Browse ──────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-ink tracking-[-0.02em]">Browse the network</h2>
        <p className="text-ink-2 text-sm mt-1">Six surfaces. Within Suppliers, the vetted categories you run.</p>

        <div className="flex gap-1.5 bg-surface-2 rounded-xl p-1 mt-4 overflow-x-auto">
          <SurfaceTab label="Suppliers" count={stats.partners} active />
          <SurfaceTab label="Resales" soon />
          <SurfaceTab label="Opportunities" soon />
          <SurfaceTab label="Property" soon />
          <SurfaceTab label="Funding" soon />
          <SurfaceTab label="Insights" soon />
        </div>

        <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          {PARTNER_CATEGORIES.filter(c => c.value !== 'other' || counts['other']).map(c => {
            const meta = categoryMeta(c.value)
            const n = counts[c.value] ?? 0
            return (
              <button
                key={c.value}
                onClick={() => ask(c.short.toLowerCase())}
                className="flex items-center gap-3 bg-surface border border-line rounded-2xl p-3.5 text-left hover:-translate-y-0.5 hover:border-[#cdd2c8] hover:shadow-[0_10px_22px_-16px_rgba(27,33,26,0.4)] transition-all"
              >
                <span className={`w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 ${meta.pill}`}>
                  <meta.Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink truncate">{meta.short}</span>
                  <span className="block text-[11.5px] text-ink-3">{n} vetted</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {introFor && <IntroModal partner={introFor} onClose={() => setIntroFor(null)} />}

      <p className="text-[11.5px] text-ink-3 mt-8 text-center">
        Demo · the concierge ranks real partner data with transparent reasons. The model-backed version swaps in behind the same flow.
      </p>
    </div>
  )
}

function firstName(name: string) {
  return name.split(' ')[0]
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-bold leading-tight" style={{ fontSize: 22, color: '#fff' }}>{n}</div>
      <div className="text-[11px]" style={{ color: '#a9bbab' }}>{label}</div>
    </div>
  )
}

function ResultHeader({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-7 h-7 rounded-lg grid place-items-center text-[13px] text-[#2b241a] flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg,#f3dcae,#e0ad68)' }}>✦</span>
      <div>
        <h2 className="text-[15px] font-bold text-ink">{label}</h2>
        <p className="text-[13px] text-ink-2 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

function MatchCard({ match, onIntro }: { match: ConciergeMatch; onIntro: () => void }) {
  const { partner: p, score, reasons } = match
  const meta = categoryMeta(p.category)
  return (
    <div className="flex gap-4 items-start bg-surface border border-line rounded-2xl p-4 hover:border-[#cdd2c8] transition-colors">
      <PartnerLogo partner={p} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-bold text-ink">{p.name}</span>
          <span className="text-[11.5px] text-ink-3">· {meta.short}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--ff-gold-ink)' }}>
            <span className="w-4 h-4 rounded grid place-items-center text-[9px] text-[#8a5e22]" style={{ background: 'linear-gradient(135deg,#f3dcae,#e0ad68)' }}>✦</span>
            Foundry mark
          </span>
        </div>
        {reasons[0] && (
          <p className="text-[13px] text-ink-2 mt-1.5">
            <span className="font-semibold" style={{ color: 'var(--ff-gold-ink)' }}>Why this: </span>{reasons[0]}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {reasons.slice(1).map((r, i) => (
            <span key={i} className="text-[11px] text-ink-2 bg-surface-2 border border-line rounded-full px-2.5 py-1">{r}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2.5 flex-shrink-0">
        <ScoreRing value={score} />
        <button onClick={onIntro} className="bg-ff-green hover:bg-[var(--ff-green-deep)] text-white text-[12.5px] font-bold rounded-xl px-3.5 py-2 whitespace-nowrap transition-colors">
          Request intro →
        </button>
      </div>
    </div>
  )
}

function ScoreRing({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-11 h-11 rounded-full grid place-items-center"
        style={{ background: `conic-gradient(var(--ff-green) ${value}%, var(--ff-border-2) 0)` }}
      >
        <span className="w-[34px] h-[34px] rounded-full bg-surface grid place-items-center text-[12px] font-bold text-ff-green">{value}</span>
      </div>
      <span className="text-[9px] uppercase tracking-wide text-ink-3">match</span>
    </div>
  )
}

function PartnerLogo({ partner }: { partner: Partner }) {
  if (partner.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={partner.logo_url} alt={partner.name} className="w-11 h-11 rounded-xl object-cover border border-line flex-shrink-0" />
  }
  const meta = categoryMeta(partner.category)
  return (
    <span className={`w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 font-bold ${meta.pill}`}>
      {partner.name.charAt(0)}
    </span>
  )
}

function SurfaceTab({ label, count, active, soon }: { label: string; count?: number; active?: boolean; soon?: boolean }) {
  return (
    <span
      className={`text-[13px] font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap flex items-center gap-2 ${active ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}
    >
      {label}
      {typeof count === 'number' && <span className="text-ink-3 font-semibold">{count}</span>}
      {soon && <span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--ff-gold-ink)' }}>soon</span>}
    </span>
  )
}

function IntroModal({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setLoading(true); setError(null)
    const res = await fetch('/api/intro-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner_id: partner.id, message }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
    setSent(true)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface rounded-2xl border border-line w-full max-w-md p-6 shadow-xl">
        {sent ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-ff-green/10 text-ff-green grid place-items-center mx-auto mb-3 text-xl">✓</div>
            <h3 className="text-ink font-bold">Introduction requested</h3>
            <p className="text-ink-2 text-sm mt-1.5">The Franchise Foundry team will make a warm introduction to <b>{partner.name}</b> and be in touch.</p>
            <button onClick={onClose} className="mt-5 bg-ff-green hover:bg-[var(--ff-green-deep)] text-white text-sm font-semibold rounded-xl px-5 py-2.5">Done</button>
          </div>
        ) : (
          <>
            <h3 className="text-ink font-bold text-lg">Request a warm introduction</h3>
            <p className="text-ink-2 text-sm mt-1.5">We'll broker the introduction to <b>{partner.name}</b> — no cold contact. Add a note if you like.</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="e.g. Looking to fund two new sites opening in Q2…"
              className="mt-4 w-full bg-ground border border-line rounded-xl p-3 text-sm text-ink outline-none focus:ring-2 focus:ring-ff-green resize-none"
            />
            {error && <p className="text-rose-600 text-xs mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="flex-1 border border-line text-ink-2 text-sm font-semibold rounded-xl px-4 py-2.5 hover:border-[#cdd2c8]">Cancel</button>
              <button onClick={submit} disabled={loading} className="flex-1 bg-ff-green hover:bg-[var(--ff-green-deep)] text-white text-sm font-semibold rounded-xl px-4 py-2.5 disabled:opacity-60">
                {loading ? 'Sending…' : 'Request intro'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
