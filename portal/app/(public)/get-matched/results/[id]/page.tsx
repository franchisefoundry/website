import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Lead, LeadMatch, FranchisorProfile } from '@/lib/supabase/types'
import RequestAccessButton from './RequestAccessButton'

function ScoreRing({ score }: { score: number }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius // ≈ 163.4
  const pct = Math.min(Math.max(score, 0), 100) / 100
  const offset = circumference * (1 - pct)

  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={radius}
          fill="none" stroke="#c8924a" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '0.68rem', fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.1,
      }}>
        {score}%<br />
        <span style={{ fontSize: '0.6rem', fontWeight: 600, opacity: 0.75 }}>match</span>
      </div>
    </div>
  )
}

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (!lead) notFound()

  const { data: matches } = await supabase
    .from('lead_matches')
    .select('*, franchisor:franchisor_profiles(category, teaser, investment_display, investment_min, investment_max, locations_display, highlights, sectors)')
    .eq('lead_id', id)
    .order('score', { ascending: false })
    .limit(3)

  const typedLead = lead as Lead
  const topMatches = (matches ?? []) as (LeadMatch & { franchisor: Partial<FranchisorProfile> | null })[]

  return (
    <>
      <style>{`
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .match-card { animation: cardReveal 0.5s ease forwards; }
        .match-card:nth-child(1) { animation-delay: 0.1s; }
        .match-card:nth-child(2) { animation-delay: 0.25s; }
        .match-card:nth-child(3) { animation-delay: 0.4s; }
        .match-card { opacity: 0; }
        .match-card:hover { border-color: rgba(200,146,74,0.35) !important; }
        @keyframes sectionIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        padding: '80px 40px 100px',
        background: '#2a352a',
        position: 'relative',
        overflow: 'hidden',
        animation: 'sectionIn 0.6s ease forwards',
      }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: -300, right: -300, width: 800, height: 800, background: 'radial-gradient(circle, rgba(200,146,74,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* Headline */}
          <h2 style={{ textAlign: 'center', color: 'white', fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10 }}>
            {topMatches.length > 0
              ? `We found your top ${topMatches.length} franchise match${topMatches.length === 1 ? '' : 'es'}!`
              : "We're reviewing your profile"}
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', fontWeight: 300, marginBottom: 48 }}>
            {topMatches.length > 0
              ? <>Ranked by compatibility — <strong style={{ color: '#f0d4a8', fontWeight: 600 }}>enter your details below to unlock brand names and full details</strong></>
              : 'No active brands match your criteria right now — book a call and we\'ll keep you updated as new brands join.'}
          </p>

          {/* Match cards */}
          {topMatches.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 48 }}>
              {topMatches.map((match) => {
                const f = match.franchisor
                const investDisplay = f?.investment_display
                  ?? (f?.investment_min && f?.investment_max
                    ? `£${(f.investment_min / 1000).toFixed(0)}k – £${(f.investment_max / 1000).toFixed(0)}k`
                    : null)

                return (
                  <div key={match.id} className="match-card" style={{
                    background: '#2a342a',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 24,
                    padding: 28,
                    transition: 'border-color 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Card header: category + score ring */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {f?.category && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)' }}>
                            {f.category}
                          </span>
                        )}
                        {/* Brand name blurred */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 120, height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 4, filter: 'blur(6px)' }} />
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </div>
                      </div>
                      <ScoreRing score={match.score} />
                    </div>

                    {/* Teaser */}
                    {f?.teaser && (
                      <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, fontWeight: 300, marginBottom: 20 }}>
                        {f.teaser}
                      </p>
                    )}

                    {/* Meta */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                      {investDisplay && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.87rem', color: 'rgba(255,255,255,0.5)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                          <span><strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Investment:</strong> {investDisplay}</span>
                        </div>
                      )}
                      {f?.locations_display && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.87rem', color: 'rgba(255,255,255,0.5)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                          <span><strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Available in:</strong> {f.locations_display}</span>
                        </div>
                      )}
                    </div>

                    {/* Highlights */}
                    {f?.highlights && f.highlights.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                        {f.highlights.slice(0, 2).map((h: string, i: number) => (
                          <span key={i} style={{
                            background: 'rgba(200,146,74,0.12)',
                            color: '#f0d4a8',
                            border: '1px solid rgba(200,146,74,0.25)',
                            borderRadius: 20, padding: '4px 12px',
                            fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.02em',
                          }}>
                            {h.length > 60 ? h.substring(0, 60) + '…' : h}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Lock bar */}
                    <div style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                        Brand name &amp; full details revealed on your free consultation call
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Disclaimer */}
          <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', marginBottom: 56, lineHeight: 1.7 }}>
            <strong style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Why are brand names hidden?</strong> We protect both you and our franchise partners.
            Full details — including brand names, financials, and introductions — are shared exclusively during your free consultation call.
          </p>

          {/* CTA */}
          <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 52 }}>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginBottom: 12, letterSpacing: '-0.02em' }}>
              Unlock your full match details
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.65)', marginBottom: 36, lineHeight: 1.7 }}>
              Book a free consultation with the Franchise Foundry team. We&apos;ll walk through your matches, reveal the brand names, and help you take the right next step.
            </p>
            <RequestAccessButton leadId={id} alreadyRequested={typedLead.status === 'meeting_requested'} />
            <p style={{ marginTop: 16, fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              Your details are secure and never shared with third parties.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
