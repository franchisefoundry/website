import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { LeadsIcon, MatchIcon, AgreementIcon, PartnerIcon, PlusIcon, ArrowRightIcon } from '@/components/icons'
import Link from 'next/link'

const PIPELINE: { key: string; label: string }[] = [
  { key: 'submitted',  label: 'Submitted'  },
  { key: 'invited',    label: 'Invited'    },
  { key: 'registered', label: 'Registered' },
  { key: 'matched',    label: 'Matched'    },
  { key: 'intro_made', label: 'Intro Made' },
  { key: 'signed',     label: 'Signed'     },
  { key: 'paid',       label: 'Paid'       },
]

const STATUS_DOT: Record<string, string> = {
  submitted:  'bg-slate-400',
  invited:    'bg-sky-400',
  registered: 'bg-violet-400',
  matched:    'bg-amber-400',
  intro_made: 'bg-orange-400',
  signed:     'bg-teal-500',
  paid:       'bg-emerald-500',
}

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted', invited: 'Invited', registered: 'Registered',
  matched: 'Matched', intro_made: 'Intro Made', signed: 'Signed',
  paid: 'Paid', rejected: 'Rejected',
}

export default async function AgentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // These three queries only depend on user.id — run them in parallel
  const [{ data: profile }, { data: leads }, { data: commissions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('introducer_leads')
      .select('id, first_name, last_name, status, created_at')
      .eq('introducer_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('introducer_commissions')
      .select('commission_amount, status')
      .eq('introducer_id', user!.id),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const all = leads ?? []

  // Counts per stage
  const counts: Record<string, number> = {}
  PIPELINE.forEach(s => { counts[s.key] = 0 })
  counts.rejected = 0
  all.forEach(l => { if (counts[l.status] !== undefined) counts[l.status]++ })

  const totalLeads     = all.length
  const activePipeline = all.filter(l =>
    ['invited','registered','matched','intro_made'].includes(l.status)
  ).length
  const signed         = counts.signed + counts.paid
  const commEarned     = (commissions ?? [])
    .filter(c => c.status === 'paid')
    .reduce((s, c) => s + (c.commission_amount ?? 0), 0)

  const recentLeads = all.slice(0, 6)

  const kpiCards = [
    {
      label: 'Total leads',
      value: totalLeads,
      sub: 'all time',
      icon: <LeadsIcon className="w-5 h-5 text-red-500" />,
      iconBg: 'bg-red-50',
    },
    {
      label: 'Active pipeline',
      value: activePipeline,
      sub: 'in progress',
      icon: <MatchIcon className="w-5 h-5 text-violet-600" />,
      iconBg: 'bg-violet-50',
    },
    {
      label: 'Signed',
      value: signed,
      sub: 'agreements',
      icon: <AgreementIcon className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50',
    },
    {
      label: 'Commission earned',
      value: `£${(commEarned / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
      sub: 'paid to date',
      icon: <PartnerIcon className="w-5 h-5 text-brand-gold" />,
      iconBg: 'bg-brand-gold/10',
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's how your pipeline is looking."
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{card.value}</p>
            <p className="text-sm font-medium text-slate-700">{card.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline flow */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-semibold text-slate-800">Pipeline</p>
          <Link href="/introducer/leads" className="text-xs text-brand-green hover:underline">
            View all leads →
          </Link>
        </div>
        <div className="flex items-start gap-0 overflow-x-auto pb-1">
          {PIPELINE.map((stage, idx) => (
            <div key={stage.key} className="flex items-center flex-shrink-0">
              {/* Stage block */}
              <div className="flex flex-col items-center min-w-[80px]">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2 ${
                  counts[stage.key] > 0 ? STATUS_DOT[stage.key] : 'bg-slate-100'
                }`}>
                  <span className={counts[stage.key] > 0 ? 'text-white' : 'text-slate-400'}>
                    {counts[stage.key]}
                  </span>
                </div>
                <p className={`text-[11px] font-medium text-center leading-tight ${
                  counts[stage.key] > 0 ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {stage.label}
                </p>
              </div>
              {/* Arrow connector (not after last) */}
              {idx < PIPELINE.length - 1 && (
                <div className="w-8 flex items-center justify-center mb-5 flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-slate-300">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Recent leads */}
        <div className="sm:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Recent leads</p>
            <Link href="/introducer/leads" className="text-xs text-brand-green hover:underline">View all →</Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">No leads yet — submit your first one below.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{lead.first_name} {lead.last_name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[lead.status] ?? 'bg-slate-300'}`} />
                    <span className="text-xs text-slate-500">{STATUS_LABEL[lead.status] ?? lead.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">Quick actions</p>
          <div className="space-y-2.5">
            <Link
              href="/introducer/leads"
              className="flex items-center gap-2.5 px-4 py-3 bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium rounded-xl transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Submit a new lead
            </Link>
            <Link
              href="/introducer/commission"
              className="flex items-center gap-2.5 px-4 py-3 border border-slate-200 hover:border-brand-green hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              <ArrowRightIcon className="w-4 h-4 text-slate-400" />
              View commission
            </Link>
          </div>

          {counts.rejected > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                <span className="font-medium text-slate-600">{counts.rejected}</span> lead{counts.rejected !== 1 ? 's' : ''} not progressed
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
