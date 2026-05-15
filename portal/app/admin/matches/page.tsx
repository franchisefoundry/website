import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { statusBadge } from '@/components/ui/badge'
import { scoreColour, scoreLabel } from '@/lib/matching'
import RunMatchingButton from './run-matching-button'
import MatchStatusSelect from './match-status-select'

export default async function MatchesPage() {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      franchisee_profiles(id, profiles(full_name)),
      franchisor_profiles(id, brand_name, category)
    `)
    .order('score', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Matches"
        description="Control which matches are visible to franchisees."
        action={<RunMatchingButton />}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Franchisee</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Brand</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Score</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matches?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-slate-400 text-center">
                  No matches yet. Use &ldquo;Run matching&rdquo; to generate scores.
                </td>
              </tr>
            )}
            {matches?.map(m => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const franchisee = m.franchisee_profiles as any
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const franchisor = m.franchisor_profiles as any
              return (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {franchisee?.profiles?.full_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">{franchisor?.brand_name}</p>
                    <p className="text-xs text-slate-400">{franchisor?.category}</p>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreColour(m.score)}`}>
                      {m.score}% — {scoreLabel(m.score)}
                    </span>
                  </td>
                  <td className="px-6 py-3">{statusBadge(m.status)}</td>
                  <td className="px-6 py-3">
                    <MatchStatusSelect matchId={m.id} currentStatus={m.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
