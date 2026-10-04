import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Section } from '@/components/crm/Section'
import { FRANCHISEE_PIPELINE_STAGES } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

function Bar({ label, value, max, color = 'var(--ff-green)' }: { label: string; value: number; max: number; color?: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[12.5px] mb-1.5">
        <span className="text-ink-2">{label}</span>
        <span className="font-bold text-ink tabular-nums">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-line overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${max ? Math.round((value / max) * 100) : 0}%`, background: color }} />
      </div>
    </div>
  )
}

export default async function AnalyticsPage() {
  const admin = createAdminClient()

  const [
    { data: leads }, { data: franchisees }, { data: brands },
    { data: matches }, { data: introLeads }, { data: agents },
  ] = await Promise.all([
    admin.from('leads').select('status, created_at, introducer_id'),
    admin.from('franchisee_profiles').select('pipeline_stage'),
    admin.from('franchisor_profiles').select('status'),
    admin.from('matches').select('score, status'),
    admin.from('introducer_leads').select('introducer_id'),
    admin.from('profiles').select('id, full_name').eq('role', 'introducer'),
  ])

  const L = leads ?? [], F = franchisees ?? [], B = brands ?? [], M = matches ?? [], IL = introLeads ?? [], A = agents ?? []

  // KPIs
  const kpis = [
    ['Leads', L.length], ['Franchisees', F.length], ['Brands', B.length],
    ['Matches', M.length], ['Agents', A.length],
    ['Avg fit score', M.length ? `${Math.round(M.reduce((n, m) => n + (m.score ?? 0), 0) / M.length)}%` : '—'],
  ] as [string, string | number][]

  // Franchisee funnel (real 8-stage pipeline)
  const funnel = FRANCHISEE_PIPELINE_STAGES.map(s => ({
    label: s.label,
    value: F.filter(f => (f.pipeline_stage ?? 'new_enquiry') === s.value).length,
  }))
  const funnelMax = Math.max(1, ...funnel.map(f => f.value))

  // Leads by month (last 6)
  const now = new Date()
  const months: { key: string; label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-GB', { month: 'short' }), count: 0 })
  }
  const mIndex = new Map(months.map((m, i) => [m.key, i]))
  for (const l of L) {
    const d = new Date(l.created_at)
    const idx = mIndex.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (idx != null) months[idx].count++
  }
  const monthMax = Math.max(1, ...months.map(m => m.count))

  // Lead source
  const agentLeads = L.filter(l => l.introducer_id).length
  const quizLeads = L.length - agentLeads

  // Brand status
  const brandStatus = [
    ['Active', B.filter(b => b.status === 'active').length, 'var(--ff-green)'],
    ['Pending review', B.filter(b => b.status === 'pending_review').length, 'var(--ff-gold)'],
    ['Draft', B.filter(b => b.status === 'draft').length, 'var(--ff-ink-3)'],
  ] as [string, number, string][]
  const brandMax = Math.max(1, ...brandStatus.map(b => b[1]))

  // Top agents by referred leads
  const byAgent = new Map<string, number>()
  for (const l of IL) byAgent.set(l.introducer_id, (byAgent.get(l.introducer_id) ?? 0) + 1)
  const nameOf = new Map(A.map(a => [a.id, a.full_name ?? 'Agent']))
  const topAgents = [...byAgent.entries()].map(([id, n]) => ({ name: nameOf.get(id) ?? 'Agent', n }))
    .sort((a, b) => b.n - a.n).slice(0, 6)
  const agentMax = Math.max(1, ...topAgents.map(a => a.n))

  return (
    <div className="max-w-6xl">
      <PageHeader title="Analytics" description="Live performance across the network — computed from your real data." />

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {kpis.map(([label, value]) => (
          <div key={label} className="bg-surface border border-line rounded-2xl px-[15px] py-[14px] shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
            <p className="text-[22px] font-bold tracking-tight text-ink tabular-nums leading-none">{value}</p>
            <p className="text-[11px] text-ink-3 mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Leads over time */}
        <Section title="Leads — last 6 months">
          <div className="flex items-end gap-3 h-[170px] pt-2">
            {months.map(m => (
              <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[11px] font-bold tabular-nums mb-1.5 text-ink">{m.count}</span>
                <div className="w-[62%] rounded-t-md" style={{ height: `${Math.round((m.count / monthMax) * 100)}%`, minHeight: m.count ? 4 : 0, background: 'var(--ff-green)' }} />
                <span className="text-[10.5px] text-ink-3 mt-1.5">{m.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Franchisee funnel */}
        <Section title="Franchisee funnel">
          {funnel.map(f => <Bar key={f.label} label={f.label} value={f.value} max={funnelMax} />)}
        </Section>

        {/* Lead source */}
        <Section title="Lead source">
          <Bar label="Matching quiz" value={quizLeads} max={Math.max(1, L.length)} />
          <Bar label="Agent referrals" value={agentLeads} max={Math.max(1, L.length)} color="var(--ff-gold-ink)" />
        </Section>

        {/* Brand status */}
        <Section title="Brands by status">
          {brandStatus.map(([label, value, color]) => <Bar key={label} label={label} value={value} max={brandMax} color={color} />)}
        </Section>

        {/* Top agents */}
        <Section title="Top agents by referred leads" className="lg:col-span-2">
          {topAgents.length === 0 ? (
            <p className="text-sm text-ink-3">No agent referrals yet.</p>
          ) : topAgents.map(a => <Bar key={a.name} label={a.name} value={a.n} max={agentMax} color="var(--ff-gold-ink)" />)}
        </Section>
      </div>
    </div>
  )
}
