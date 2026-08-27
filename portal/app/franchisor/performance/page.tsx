import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { resolveBrand } from '@/lib/resolve-brand'
import { CountUp } from '@/components/ui/CountUp'

export default async function FranchisorPerformancePage() {
  const { brandProfile } = await resolveBrand()
  const admin = createAdminClient()

  const { data: rawMatches } = brandProfile
    ? await admin.from('matches')
        .select('id, status, pipeline_stage, score, franchisee_profiles(profiles!franchisee_profiles_user_id_fkey(role))')
        .eq('franchisor_id', brandProfile.id).eq('franchisor_revealed', true)
    : { data: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (rawMatches ?? []).filter(m => (m.franchisee_profiles as any)?.profiles?.role === 'franchisee')

  const total = matches.length
  const interested = matches.filter(m => m.status === 'interested' || m.status === 'intro_made').length
  const intros = matches.filter(m => m.status === 'intro_made').length
  const meetings = matches.filter(m => m.pipeline_stage === 'meeting_booked').length
  const agreements = matches.filter(m => m.pipeline_stage === 'agreement_sent' || m.pipeline_stage === 'agreement_signed').length
  const avgScore = total ? Math.round(matches.reduce((n, m) => n + (m.score ?? 0), 0) / total) : 0

  const kpis = [
    { n: total, l: 'Candidates matched' },
    { n: avgScore, l: 'Avg fit score', suffix: '%' },
    { n: interested, l: 'You’re interested' },
    { n: intros, l: 'Intros arranged' },
  ]
  const funnel = [
    ['Matched', total], ['Interested', interested], ['Intro made', intros], ['Meeting', meetings], ['Agreement', agreements],
  ] as [string, number][]
  const fmax = Math.max(1, total)

  return (
    <div className="max-w-4xl">
      <PageHeader title="Performance" description="How your brand is doing across the recruitment funnel." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {kpis.map((k, i) => (
          <div key={k.l} className="rise bg-surface border border-line rounded-2xl px-4 py-4 shadow-[0_1px_2px_rgba(27,33,26,0.05)]" style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
            <p className="text-[28px] font-extrabold tracking-tight text-ink tabular-nums leading-none"><CountUp value={k.n} suffix={k.suffix ?? ''} /></p>
            <p className="text-[11px] text-ink-3 mt-1.5">{k.l}</p>
          </div>
        ))}
      </div>

      <div className="rise bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-5 mb-4" style={{ animationDelay: '0.28s' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-4">Recruitment funnel</p>
        {funnel.map(([label, value]) => (
          <div key={label} className="mb-3 last:mb-0">
            <div className="flex justify-between text-[12.5px] mb-1.5"><span className="text-ink-2">{label}</span><span className="font-bold text-ink tabular-nums">{value}</span></div>
            <div className="h-2 rounded-full bg-line overflow-hidden">
              <div className="h-full rounded-full bg-ff-green transition-all" style={{ width: `${Math.round((value / fmax) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="rise bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-5 flex items-start gap-3" style={{ animationDelay: '0.34s' }}>
        <span className="text-lg">✨</span>
        <div>
          <p className="text-sm font-semibold text-ink">More insights coming soon</p>
          <p className="text-xs text-ink-2 mt-0.5">Profile views, candidate feedback, time-to-match and how you benchmark against the wider network.</p>
        </div>
      </div>
    </div>
  )
}
