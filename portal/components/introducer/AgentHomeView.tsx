import Link from 'next/link'
import { CountUp } from '@/components/ui/CountUp'
import { PlusIcon, ArrowRightIcon } from '@/components/icons'

const PIPELINE: { key: string; label: string }[] = [
  { key: 'submitted', label: 'Submitted' }, { key: 'invited', label: 'Invited' },
  { key: 'registered', label: 'Registered' }, { key: 'matched', label: 'Matched' },
  { key: 'intro_made', label: 'Intro Made' }, { key: 'signed', label: 'Signed' }, { key: 'paid', label: 'Paid' },
]
const STATUS_DOT: Record<string, string> = {
  submitted: 'bg-surface-2', invited: 'bg-sky-400', registered: 'bg-violet-400', matched: 'bg-amber-400',
  intro_made: 'bg-orange-400', signed: 'bg-ff-green', paid: 'bg-ff-green',
}
const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted', invited: 'Invited', registered: 'Registered', matched: 'Matched',
  intro_made: 'Intro Made', signed: 'Signed', paid: 'Paid', rejected: 'Rejected',
}

export interface AgentKpi { label: string; value: number | string; sub: string; icon: React.ReactNode; iconBg: string }
export interface AgentLead { id: string; first_name: string | null; last_name: string | null; status: string; created_at: string }

interface Props {
  firstName: string
  kpis: AgentKpi[]
  counts: Record<string, number>
  recentLeads: AgentLead[]
  rejectedCount: number
}

/** Presentational agent (introducer) home — shared by the real page and /design-preview. */
export function AgentHomeView({ firstName, kpis, counts, recentLeads, rejectedCount }: Props) {
  const active = (counts.invited ?? 0) + (counts.registered ?? 0) + (counts.matched ?? 0) + (counts.intro_made ?? 0)
  return (
    <div className="max-w-5xl">
      {/* Hero */}
      <div className="rise relative overflow-hidden rounded-2xl p-6 text-white shadow-[0_18px_40px_rgba(27,33,26,0.22)] bg-gradient-to-br from-ff-green to-ff-green-deep">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(560px 220px at 88% -30%, rgba(200,146,74,0.34), transparent 60%)' }} />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {firstName}</h1>
          <p className="text-sm text-white/70 mt-1.5">{active > 0 ? `You have ${active} lead${active === 1 ? '' : 's'} moving through the pipeline.` : 'Submit a lead or share your referral link to get started.'}</p>
          <Link href="/introducer/leads" className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ff-green-deep shadow-[0_6px_18px_rgba(200,146,74,0.4)] bg-gradient-to-br from-ff-gold to-[#dcae6b] hover:-translate-y-0.5 transition-transform">
            <PlusIcon className="w-4 h-4" /> Submit a new lead
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {kpis.map((card, i) => (
          <div key={card.label} className="lift rise bg-surface rounded-2xl border border-line p-4 shadow-[0_1px_2px_rgba(27,33,26,0.05)]" style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.iconBg}`}>{card.icon}</div>
            <p className="text-[26px] font-extrabold text-ink tracking-tight tabular-nums leading-none">{typeof card.value === 'number' ? <CountUp value={card.value} /> : card.value}</p>
            <p className="text-sm font-medium text-ink-2 mt-1.5">{card.label}</p>
            <p className="text-xs text-ink-3 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline flow */}
      <div className="rise bg-surface rounded-2xl border border-line p-6 mt-4 shadow-[0_1px_2px_rgba(27,33,26,0.05)]" style={{ animationDelay: '0.28s' }}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3">Pipeline</p>
          <Link href="/introducer/leads" className="text-xs font-medium text-ff-green hover:underline">View all leads →</Link>
        </div>
        <div className="flex items-start gap-0 overflow-x-auto pb-1">
          {PIPELINE.map((stage, idx) => (
            <div key={stage.key} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center min-w-[80px]">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${counts[stage.key] > 0 ? `${STATUS_DOT[stage.key]} text-white` : 'bg-surface-2 text-ink-3'}`}>{counts[stage.key] ?? 0}</div>
                <p className={`text-[11px] font-medium text-center leading-tight ${counts[stage.key] > 0 ? 'text-ink-2' : 'text-ink-3'}`}>{stage.label}</p>
              </div>
              {idx < PIPELINE.length - 1 && (
                <div className="w-8 flex items-center justify-center mb-5 flex-shrink-0">
                  <ArrowRightIcon className="w-4 h-4 text-ink-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <div className="rise sm:col-span-2 bg-surface rounded-2xl border border-line p-6 shadow-[0_1px_2px_rgba(27,33,26,0.05)]" style={{ animationDelay: '0.34s' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3">Recent leads</p>
            <Link href="/introducer/leads" className="text-xs font-medium text-ff-green hover:underline">View all →</Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">No leads yet — submit your first one above.</p>
          ) : (
            <div className="divide-y divide-line-2">
              {recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{lead.first_name} {lead.last_name}</p>
                    <p className="text-xs text-ink-3">{new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[lead.status] ?? 'bg-surface-2'}`} />
                    <span className="text-xs text-ink-3">{STATUS_LABEL[lead.status] ?? lead.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rise bg-surface rounded-2xl border border-line p-6 shadow-[0_1px_2px_rgba(27,33,26,0.05)]" style={{ animationDelay: '0.4s' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-4">Quick actions</p>
          <div className="space-y-2.5">
            <Link href="/introducer/leads" className="flex items-center gap-2.5 px-4 py-3 bg-ff-green hover:brightness-110 text-white text-sm font-medium rounded-xl transition-all"><PlusIcon className="w-4 h-4" /> Submit a new lead</Link>
            <Link href="/introducer/commission" className="flex items-center gap-2.5 px-4 py-3 border border-line hover:border-ff-green hover:bg-surface-2 text-ink-2 text-sm font-medium rounded-xl transition-colors"><ArrowRightIcon className="w-4 h-4 text-ink-3" /> View commission</Link>
            <Link href="/introducer/tools" className="flex items-center gap-2.5 px-4 py-3 border border-line hover:border-ff-green hover:bg-surface-2 text-ink-2 text-sm font-medium rounded-xl transition-colors"><ArrowRightIcon className="w-4 h-4 text-ink-3" /> Get your referral link</Link>
          </div>
          {rejectedCount > 0 && (
            <div className="mt-5 pt-4 border-t border-line-2">
              <p className="text-xs text-ink-3"><span className="font-medium text-ink-2">{rejectedCount}</span> lead{rejectedCount !== 1 ? 's' : ''} not progressed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
