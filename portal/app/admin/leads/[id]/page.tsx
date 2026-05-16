import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { scoreLabel, scoreColour } from '@/lib/matching'
import type { Lead, LeadMatch } from '@/lib/supabase/types'
import ConvertButton from './ConvertButton'
import DeleteLeadButton from '../DeleteLeadButton'

const OPERATOR_LABELS: Record<string, string> = {
  'owner-operator': 'Owner-operator',
  'hire-manager': 'Hire a manager',
  'either': 'Either',
}

const EXPERIENCE_LABELS: Record<string, string> = {
  'none': 'No prior experience',
  'management': 'Management experience',
  'food-beverage': 'Food & beverage experience',
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()

  const { data: lead } = await admin.from('leads').select('*').eq('id', id).single()
  if (!lead) notFound()

  const { data: matches } = await admin
    .from('lead_matches')
    .select('*, franchisor:franchisor_profiles(brand_name, category, investment_min, investment_max, investment_display, locations_display, highlights, teaser)')
    .eq('lead_id', id)
    .order('score', { ascending: false })

  const typedLead = lead as Lead
  const typedMatches = (matches ?? []) as LeadMatch[]

  return (
    <div>
      <PageHeader
        title={typedLead.full_name}
        description={`Lead · ${new Date(typedLead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        action={<DeleteLeadButton leadId={id} redirectAfter />}
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Left — profile details */}
        <div className="col-span-1 space-y-4">
          {/* Contact */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Email</span>
                <p className="text-slate-800 font-medium">{typedLead.email}</p>
              </div>
              <div>
                <span className="text-slate-400">Phone</span>
                <p className="text-slate-800 font-medium">{typedLead.phone ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-400">Status</span>
                <p className="text-slate-800 font-medium capitalize">{typedLead.status.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Budget</h3>
            <p className="text-slate-800 text-sm font-medium">
              {typedLead.investment_min && typedLead.investment_max
                ? `£${typedLead.investment_min.toLocaleString()} – £${typedLead.investment_max.toLocaleString()}`
                : '—'}
            </p>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Preferences</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Operator model</span>
                <p className="text-slate-800">{typedLead.operator_model ? OPERATOR_LABELS[typedLead.operator_model] : '—'}</p>
              </div>
              <div>
                <span className="text-slate-400">Experience</span>
                <p className="text-slate-800">{typedLead.experience ? EXPERIENCE_LABELS[typedLead.experience] : '—'}</p>
              </div>
              <div>
                <span className="text-slate-400">Full-time</span>
                <p className="text-slate-800">{typedLead.full_time_available ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="text-slate-400">Multi-site interest</span>
                <p className="text-slate-800">{typedLead.multi_site_interest ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="text-slate-400">Timeline</span>
                <p className="text-slate-800">{typedLead.timeline_months ? `${typedLead.timeline_months} months` : '—'}</p>
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Locations</h3>
            {typedLead.preferred_locations?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {typedLead.preferred_locations.map(l => (
                  <span key={l} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">{l}</span>
                ))}
              </div>
            ) : <p className="text-slate-400 text-sm">—</p>}
          </div>

          {/* Sectors */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Sectors</h3>
            {typedLead.sectors?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {typedLead.sectors.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">{s.replace('-', ' ')}</span>
                ))}
              </div>
            ) : <p className="text-slate-400 text-sm">—</p>}
          </div>

          {/* Goals */}
          {typedLead.goals && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Background & goals</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{typedLead.goals}</p>
            </div>
          )}

          {/* Convert action */}
          {typedLead.status !== 'converted' && (
            <div className="bg-brand-green/5 border border-brand-green/20 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Convert to franchisee</h3>
              <p className="text-xs text-slate-500 mb-4">
                Sends a portal invite, creates their franchisee profile pre-filled with this data, and transfers their matches.
              </p>
              <ConvertButton leadId={id} />
            </div>
          )}
          {typedLead.status === 'converted' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-700 font-medium text-center">
              ✓ Converted to franchisee
            </div>
          )}
        </div>

        {/* Right — matches */}
        <div className="col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Pre-computed matches ({typedMatches.length})
          </h3>
          {typedMatches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              No matches found for this lead&apos;s criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {typedMatches.map(match => {
                const f = match.franchisor as {
                  brand_name?: string
                  category?: string
                  investment_display?: string
                  investment_min?: number
                  investment_max?: number
                  locations_display?: string
                  highlights?: string[]
                  teaser?: string
                } | undefined

                return (
                  <div key={match.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{f?.brand_name ?? 'Unknown brand'}</p>
                        {f?.category && <p className="text-xs text-slate-400 mt-0.5">{f.category}</p>}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${scoreColour(match.score)}`}>
                        {match.score}% · {scoreLabel(match.score)}
                      </span>
                    </div>
                    {f?.teaser && <p className="text-sm text-slate-600 mb-3 leading-relaxed">{f.teaser}</p>}
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>
                        💰 {f?.investment_display ?? (f?.investment_min && f?.investment_max
                          ? `£${f.investment_min.toLocaleString()} – £${f.investment_max.toLocaleString()}`
                          : '—')}
                      </span>
                      {f?.locations_display && <span>📍 {f.locations_display}</span>}
                    </div>
                    {f?.highlights?.length ? (
                      <ul className="mt-3 space-y-1">
                        {f.highlights.map((h, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                            <span className="text-brand-green mt-0.5">▪</span> {h}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
