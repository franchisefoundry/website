import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { scoreColour, scoreLabel } from '@/lib/matching'
import { statusBadge } from '@/components/ui/badge'
import { MATCH_PIPELINE_STAGES } from '@/lib/supabase/types'
import Link from 'next/link'
import MatchPipelineSelect from './match-pipeline-select'
import MatchNotesInline from './match-notes-inline'

export default async function MatchesPage() {
  const admin = createAdminClient()

  const { data: matches } = await admin
    .from('matches')
    .select(`
      *,
      franchisee_profiles(
        id,
        assigned_franchisor_id,
        backup_franchisor_1_id,
        backup_franchisor_2_id,
        profiles!franchisee_profiles_user_id_fkey(full_name, role)
      ),
      franchisor_profiles(id, brand_name, category, logo_url)
    `)
    .in('status', ['suggested', 'shown', 'interested', 'intro_made'])
    .order('created_at', { ascending: false })

  // Filter out admin/franchisor users appearing as franchisees
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeMatches = (matches ?? []).filter(m => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = (m.franchisee_profiles as any)?.profiles
    return profile?.role === 'franchisee'
  })

  // Group by franchisor — detect primary vs backup by comparing franchisor_id
  // against the three assignment columns on the franchisee_profiles row
  const byFranchisor = new Map<string, {
    franchisorId: string
    brandName: string
    category: string | null
    logoUrl: string | null
    primary: typeof activeMatches
    backups: typeof activeMatches
  }>()

  for (const m of activeMatches) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fr = m.franchisor_profiles as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fp = m.franchisee_profiles as any
    const fid = fr?.id ?? 'unknown'

    if (!byFranchisor.has(fid)) {
      byFranchisor.set(fid, {
        franchisorId: fid,
        brandName: fr?.brand_name ?? 'Unnamed brand',
        category: fr?.category ?? null,
        logoUrl: fr?.logo_url ?? null,
        primary: [],
        backups: [],
      })
    }

    const group = byFranchisor.get(fid)!
    // Determine rank by checking which slot this franchisor fills for the franchisee
    if (fp?.assigned_franchisor_id === m.franchisor_id) {
      group.primary.push(m)
    } else if (
      fp?.backup_franchisor_1_id === m.franchisor_id ||
      fp?.backup_franchisor_2_id === m.franchisor_id
    ) {
      group.backups.push(m)
    }
    // Matches not in any assigned slot are skipped (old algorithmic matches)
  }

  const groups = [...byFranchisor.values()]
    .filter(g => g.primary.length > 0 || g.backups.length > 0)
    .sort((a, b) => a.brandName.localeCompare(b.brandName))

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
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-1 font-medium">
                  {group.primary.length} primary
                </span>
                {group.backups.length > 0 && (
                  <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                    +{group.backups.length} backup
                  </span>
                )}
              </div>
            </div>

            {/* Primary match rows */}
            {group.primary.length === 0 ? (
              <p className="px-6 py-4 text-xs text-slate-400 italic">No primary assignments yet.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {group.primary.map(m => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const franchisee = m.franchisee_profiles as any
                  const name = franchisee?.profiles?.full_name ?? 'Unknown'
                  return (
                    <div key={m.id} className="px-6 py-4">
                      <div className="flex items-start gap-4">
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
                          <MatchPipelineSelect
                            matchId={m.id}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            currentStage={(m as any).pipeline_stage ?? null}
                          />
                        </div>
                        <div className="shrink-0 w-72">
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
            )}

            {/* Backup matches — collapsible */}
            {group.backups.length > 0 && (
              <details className="group border-t border-slate-100">
                <summary className="px-6 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-600 hover:bg-slate-50 transition-colors list-none flex items-center gap-1.5 select-none">
                  <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                  {group.backups.length} franchisee{group.backups.length !== 1 ? 's' : ''} also have this as a backup option
                </summary>
                <div className="divide-y divide-slate-100 bg-slate-50/50">
                  {group.backups.map(m => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const franchisee = m.franchisee_profiles as any
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const fp = m.franchisee_profiles as any
                    const name = franchisee?.profiles?.full_name ?? 'Unknown'
                    const isBackup2 = fp?.backup_franchisor_2_id === m.franchisor_id
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pipelineStage = MATCH_PIPELINE_STAGES.find(s => s.value === (m as any).pipeline_stage)
                    return (
                      <div key={m.id} className="px-6 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 shrink-0">
                            {isBackup2 ? 'Backup 2' : 'Backup 1'}
                          </span>
                          <Link
                            href={`/admin/franchisees/${franchisee?.id}`}
                            className="text-sm text-slate-600 hover:text-brand-green transition-colors"
                          >
                            {name}
                          </Link>
                          <div className="ml-auto flex items-center gap-2 shrink-0">
                            {pipelineStage && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                {pipelineStage.emoji} {pipelineStage.label}
                              </span>
                            )}
                            {statusBadge(m.status)}
                            {m.score > 0 && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColour(m.score)}`}>
                                {m.score}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
