import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { resolveBrand } from '@/lib/resolve-brand'
import { scoreColour } from '@/lib/matching'

const COLUMNS = [
  { id: 'matched', label: 'Matched', dot: 'var(--ff-ink-3)' },
  { id: 'interested', label: 'Interested', dot: 'var(--ff-ok)' },
  { id: 'intro', label: 'Intro made', dot: 'var(--ff-gold)' },
  { id: 'meeting', label: 'Meeting', dot: '#2563eb' },
  { id: 'agreement', label: 'Agreement', dot: 'var(--ff-green)' },
] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stageOf(m: any): string {
  const ps = m.pipeline_stage
  if (ps === 'agreement_sent' || ps === 'agreement_signed') return 'agreement'
  if (ps === 'meeting_booked') return 'meeting'
  if (m.status === 'intro_made') return 'intro'
  if (m.status === 'interested') return 'interested'
  return 'matched'
}

export default async function FranchisorPipelinePage() {
  const { brandProfile } = await resolveBrand()
  const admin = createAdminClient()

  const { data: rawMatches } = brandProfile
    ? await admin.from('matches')
        .select('id, status, pipeline_stage, score, franchisee_profiles(investment_min, investment_max, preferred_locations, profiles!franchisee_profiles_user_id_fkey(full_name, role))')
        .eq('franchisor_id', brandProfile.id).eq('franchisor_revealed', true)
    : { data: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (rawMatches ?? []).filter(m => (m.franchisee_profiles as any)?.profiles?.role === 'franchisee')

  const byStage: Record<string, typeof matches> = { matched: [], interested: [], intro: [], meeting: [], agreement: [] }
  for (const m of matches) byStage[stageOf(m)].push(m)

  return (
    <div>
      <PageHeader title="Pipeline" description="Every candidate matched to your brand, by stage." />
      {matches.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center text-sm text-ink-3">
          No candidates in your pipeline yet — they’ll appear here as we match them.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {COLUMNS.map(col => (
            <div key={col.id} className="rise">
              <div className="flex items-center gap-2 mb-2.5 px-1">
                <span className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">{col.label}</span>
                <span className="text-[11px] text-ink-3 tabular-nums ml-auto">{byStage[col.id].length}</span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {byStage[col.id].map(m => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const fc = m.franchisee_profiles as any
                  const revealed = col.id !== 'matched' && col.id !== 'interested'
                  const name = revealed ? (fc?.profiles?.full_name?.split(' ')[0] ?? 'Candidate') : 'Confidential'
                  const budget = fc?.investment_min && fc?.investment_max ? `£${Math.round(fc.investment_min / 1000)}–${Math.round(fc.investment_max / 1000)}k` : '—'
                  return (
                    <div key={m.id} className="bg-surface border border-line rounded-xl p-3 shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink truncate">{name}</span>
                        {m.score > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${scoreColour(m.score)}`}>{m.score}%</span>}
                      </div>
                      <p className="text-[11px] text-ink-3 mt-1 tabular-nums">{budget}</p>
                    </div>
                  )
                })}
                {byStage[col.id].length === 0 && <div className="border border-dashed border-line-2 rounded-xl h-14" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
