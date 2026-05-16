import { createAdminClient } from '@/lib/supabase/admin'
import { scoreMatch } from '@/lib/matching'
import type { FranchiseeProfile, FranchisorProfile } from '@/lib/supabase/types'
import UnlockForm from './UnlockForm'

function ScoreRing({ score }: { score: number }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100)
  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#c8924a" strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '0.68rem', fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.1 }}>
        {score}%<br /><span style={{ fontSize: '0.6rem', opacity: 0.75 }}>match</span>
      </div>
    </div>
  )
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ResultsPage({ searchParams }: Props) {
  const params = await searchParams
  const get = (k: string) => (Array.isArray(params[k]) ? (params[k] as string[])[0] : params[k] as string | undefined) ?? ''

  const bmin = get('bmin') ? Number(get('bmin')) : null
  const bmax = get('bmax') ? Number(get('bmax')) : null
  const liquid_capital = get('liq') ? Number(get('liq')) : null
  const operator_model = get('op') || null
  const experience = get('exp') || null
  const full_time_available = get('ft') !== 'false'
  const multi_site_interest = get('ms') === 'true'
  const timeline_months = get('tl') ? Number(get('tl')) : null
  const format_types = get('fmt') ? get('fmt').split(',').filter(Boolean) : []
  const preferred_locations = get('loc') ? get('loc').split(',').filter(Boolean) : []
  const other_location = get('oloc') || ''
  const goals = get('goals') || ''

  // Load active franchisors and compute top 3 matches
  const supabase = createAdminClient()
  const { data: franchisors } = await supabase
    .from('franchisor_profiles')
    .select('*')
    .eq('status', 'active')

  const pseudo: FranchiseeProfile = {
    id: 'temp',
    user_id: 'temp',
    investment_min: bmin,
    investment_max: bmax,
    liquid_capital,
    preferred_locations,
    operator_model: operator_model as FranchiseeProfile['operator_model'],
    experience: experience as FranchiseeProfile['experience'],
    full_time_available,
    multi_site_interest,
    timeline_months,
    sectors: ['food-beverage'],
    format_types,
    goals,
    status: 'active',
    tier_2_unlocked: false,
    invited_at: null, activated_at: null, signed_at: null, assigned_admin: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const scored = (franchisors ?? [])
    .map(f => ({ franchisor: f as FranchisorProfile, score: scoreMatch(pseudo, f as FranchisorProfile) }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const quizData = { bmin, bmax, liquid_capital, operator_model, experience, full_time_available, multi_site_interest, timeline_months, format_types, preferred_locations, other_location, goals }

  return (
    <>
      <style>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .mc { opacity: 0; animation: cardIn 0.5s ease forwards; }
        .mc:nth-child(1) { animation-delay: 0.1s; }
        .mc:nth-child(2) { animation-delay: 0.25s; }
        .mc:nth-child(3) { animation-delay: 0.4s; }
        .mc:hover { border-color: rgba(200,146,74,0.35) !important; }
      `}</style>

      <div style={{ padding: '80px 40px 100px', background: '#2a352a', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -300, right: -300, width: 800, height: 800, background: 'radial-gradient(circle, rgba(200,146,74,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>

          <h2 style={{ textAlign: 'center', color: 'white', fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10 }}>
            {scored.length > 0
              ? `We found your top ${scored.length} franchise match${scored.length === 1 ? '' : 'es'}!`
              : "We're reviewing your profile"}
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', fontWeight: 300, marginBottom: 48 }}>
            {scored.length > 0
              ? <><strong style={{ color: '#f0d4a8', fontWeight: 600 }}>Ranked by compatibility</strong> — enter your details below to unlock brand names and arrange your free consultation</>
              : "No active brands match your criteria right now — enter your details and we'll be in touch as new brands join."}
          </p>

          {/* Match cards */}
          {scored.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 48 }}>
              {scored.map(({ franchisor: f, score }) => {
                const investDisplay = f.investment_display
                  ?? (f.investment_min && f.investment_max
                    ? `£${(f.investment_min / 1000).toFixed(0)}k – £${(f.investment_max / 1000).toFixed(0)}k`
                    : null)
                return (
                  <div key={f.id} className="mc" style={{ background: '#2a342a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: 28, transition: 'border-color 0.2s', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {f.category && <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)' }}>{f.category}</span>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 120, height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 4, filter: 'blur(6px)' }} />
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        </div>
                      </div>
                      <ScoreRing score={score} />
                    </div>

                    {f.teaser && <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, fontWeight: 300, marginBottom: 20 }}>{f.teaser}</p>}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                      {investDisplay && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.87rem', color: 'rgba(255,255,255,0.5)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                          <span><strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Investment:</strong> {investDisplay}</span>
                        </div>
                      )}
                      {f.locations_display && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.87rem', color: 'rgba(255,255,255,0.5)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                          <span><strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Available in:</strong> {f.locations_display}</span>
                        </div>
                      )}
                    </div>

                    {f.highlights && f.highlights.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                        {(f.highlights as string[]).slice(0, 1).map((h, i) => (
                          <span key={i} style={{ background: 'rgba(200,146,74,0.12)', color: '#f0d4a8', border: '1px solid rgba(200,146,74,0.25)', borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {h.length > 70 ? h.substring(0, 70) + '…' : h}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Brand name revealed on your free consultation call</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)', marginBottom: 56, lineHeight: 1.7 }}>
            <strong style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Why are brand names hidden?</strong> We protect both you and our franchise partners. Full details — including brand names, financials, and introductions — are shared exclusively during your free consultation call.
          </p>

          {/* Unlock form */}
          <UnlockForm quizData={quizData} matchCount={scored.length} />
        </div>
      </div>
    </>
  )
}
