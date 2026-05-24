import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { scoreColour, scoreLabel } from '@/lib/matching'
import Link from 'next/link'
import MatchPipelineSelect from './match-pipeline-select'
import MatchNotesInline from './match-notes-inline'

export default async function MatchesPage() {
  const admin = createAdminClient()

  const { data: matches } = await admin
    .from('matches')
    .select(`
      *,
      franchisee_profiles(id, profiles!franchisee_profiles_user_id_fkey(full_name)),
      franchisor_profiles(id, brand_name, category, logo_url)
    `)
    .in('status', ['suggested', 'shown', 'interested', 'intro_made'])
    .order('created_at', { ascending: false })

  // Group by franchisor
  const byFranchisor = new Map<string, {
    franchisorId: string
    brandName: string
    category: string | null
    logoUrl: string | null
    matches: typeof matches
  }>()

  for (const m of matches ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fr = m.franchisor_profiles as any
    const fid = fr?.id ?? 'unknown'
    if (!byFranchisor.has(fid)) {
      byFranchisor.set(fid, {
        franchisorId: fid,
        brandName: fr?.brand_name ?? 'Unnamed brand',
        category: fr?.category ?? null,
        logoUrl: fr?.logo_url ?? null,
        matches: [],
      })
    }
    byFranchisor.get(fid)!.matches!.push(m)
  }

  const groups = [...byFranchisor.values()].sort((a, b) =>
    a.brandName.localeCompare(b.brandName)
  )

  return (
    <div>
      <PageHeader
        title="Match pipeline"
        description="Active matches grouped by brand — advance stages and add notes inline."
      />

      {groups.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">No active matches yet.</p>
          <p className="text-xs text-slate-300 mt-1">
            Assign brands to franchisees from the{' '}
            <Link href="/admin/franchisees" className="underline">franchisees</Link> page.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.franchisorId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Brand header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
              {group.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={group.logoUrl} alt={group.brandName} className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 p-0.5" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green font-bold text-sm">
                  {group.brandName.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{group.brandName}</p>
                {group.category && <p className="text-xs text-slate-400">{group.category}</p>}
              </div>
              <span className="ml-auto text-xs text-slate-400 bg-slate-100 rounded-full px-2.5 py-1 font-medium">
                {group.matches?.length} {group.matches?.length === 1 ? 'match' : 'matches'}
              </span>
            </div>

            {/* Match rows */}
            <div className="divide-y divide-slate-50">
              {group.matches?.map(m => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const franchisee = m.franchisee_profiles as any
                const name = franchisee?.profiles?.full_name ?? 'Unknown'
                return (
                  <div key={m.id} className="px-6 py-4">
                    <div className="flex items-start gap-4">
                      {/* Franchisee info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/admin/franchisees/${franchisee?.id}`}
                            className="text-sm font-medium text-slate-900 hover:text-brand-green transition-colors"
                          >
                            {name}
                          </Link>
                          {m.score > 0 && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColour(m.score)}`}>
                              {m.score}% — {scoreLabel(m.score)}
                            </span>
                          )}
                        </div>
                        {/* Pipeline stage dropdown */}
                        <MatchPipelineSelect
                          matchId={m.id}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          currentStage={(m as any).pipeline_stage ?? null}
                        />
                      </div>

                      {/* Notes toggle */}
                      <div className="shrink-0 w-80">
                        <MatchNotesInline
                          matchId={m.id}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          initialInternal={(m as any).internal_notes ?? ''}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          initialFranchisor={(m as any).franchisor_notes ?? ''}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
