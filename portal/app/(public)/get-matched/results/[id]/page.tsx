import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { scoreLabel, scoreColour } from '@/lib/matching'
import type { Lead, LeadMatch } from '@/lib/supabase/types'
import RequestAccessButton from './RequestAccessButton'

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
    .select('*, franchisor:franchisor_profiles(category, sectors)')
    .eq('lead_id', id)
    .order('score', { ascending: false })

  const typedLead = lead as Lead
  const typedMatches = (matches ?? []) as LeadMatch[]
  const matchCount = typedMatches.length
  const topMatches = typedMatches.slice(0, 5)

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        {matchCount > 0 ? (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-green/10 mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              We found {matchCount} {matchCount === 1 ? 'match' : 'matches'} for you
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              Based on your budget, location and preferences,{' '}
              {matchCount === 1 ? 'this brand looks' : 'these brands look'} like a strong fit.
              Book a call with us to unlock your full results.
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">We&apos;re reviewing your profile</h1>
            <p className="text-slate-500 mt-2 text-sm">
              No active brands match your criteria right now — but we&apos;re constantly adding new ones.
              Book a call and we&apos;ll keep you posted.
            </p>
          </>
        )}
      </div>

      {/* Blurred match cards */}
      {topMatches.length > 0 && (
        <div className="space-y-3 mb-6">
          {topMatches.map((match, i) => {
            const franchisor = match.franchisor as { category?: string; sectors?: string[] } | undefined
            return (
              <div key={match.id} className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Lock overlay */}
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Book a call to unlock</p>
                </div>

                {/* Card content (blurred behind overlay) */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-400">Match #{i + 1}</span>
                        {franchisor?.category && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                            {franchisor.category}
                          </span>
                        )}
                      </div>
                      <div className="h-4 bg-slate-200 rounded w-32 mb-1" />
                      <div className="h-3 bg-slate-100 rounded w-48" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${scoreColour(match.score)}`}>
                      {scoreLabel(match.score)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                    <div className="h-3 bg-slate-100 rounded w-4/6" />
                  </div>
                  <div className="mt-4 flex gap-4">
                    <div className="h-3 bg-slate-100 rounded w-24" />
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </div>
                </div>
              </div>
            )
          })}

          {matchCount > 5 && (
            <p className="text-center text-sm text-slate-400">
              +{matchCount - 5} more {matchCount - 5 === 1 ? 'match' : 'matches'} hidden
            </p>
          )}
        </div>
      )}

      {/* CTA card */}
      <div className="bg-brand-green rounded-2xl p-6 text-white text-center">
        <h2 className="text-lg font-semibold mb-2">Ready to see your matches?</h2>
        <p className="text-white/80 text-sm mb-5">
          Book a free 30-minute call with the Franchise Foundry team. We&apos;ll walk through
          your matches, answer your questions, and help you take the right next step.
        </p>
        <RequestAccessButton leadId={id} alreadyRequested={typedLead.status === 'meeting_requested'} />
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">
        Your information is kept confidential and never shared without your permission.
      </p>
    </div>
  )
}
