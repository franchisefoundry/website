import { createClient } from '@/lib/supabase/server'
import { LeadsIcon, MatchIcon, AgreementIcon, PartnerIcon } from '@/components/icons'
import { AgentHomeView, type AgentKpi } from '@/components/introducer/AgentHomeView'

const PIPELINE_KEYS = ['submitted', 'invited', 'registered', 'matched', 'intro_made', 'signed', 'paid']

export default async function AgentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: leads }, { data: commissions }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('introducer_leads').select('id, first_name, last_name, status, created_at').eq('introducer_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('introducer_commissions').select('commission_amount, status').eq('introducer_id', user!.id),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const all = leads ?? []

  const counts: Record<string, number> = {}
  PIPELINE_KEYS.forEach(k => { counts[k] = 0 })
  counts.rejected = 0
  all.forEach(l => { if (counts[l.status] !== undefined) counts[l.status]++ })

  const totalLeads = all.length
  const activePipeline = all.filter(l => ['invited', 'registered', 'matched', 'intro_made'].includes(l.status)).length
  const signed = counts.signed + counts.paid
  const commEarned = (commissions ?? []).filter(c => c.status === 'paid').reduce((s, c) => s + (c.commission_amount ?? 0), 0)
  const recentLeads = all.slice(0, 6)

  const kpis: AgentKpi[] = [
    { label: 'Total leads', value: totalLeads, sub: 'all time', icon: <LeadsIcon className="w-5 h-5 text-ink-2" />, iconBg: 'bg-surface-2' },
    { label: 'Active pipeline', value: activePipeline, sub: 'in progress', icon: <MatchIcon className="w-5 h-5 text-[#3b62c4]" />, iconBg: 'bg-[#eff4ff]' },
    { label: 'Signed', value: signed, sub: 'agreements', icon: <AgreementIcon className="w-5 h-5 text-ff-green" />, iconBg: 'bg-ff-green-soft' },
    { label: 'Commission earned', value: `£${(commEarned / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, sub: 'paid to date', icon: <PartnerIcon className="w-5 h-5 text-ff-gold-ink" />, iconBg: 'bg-ff-gold-soft' },
  ]

  return <AgentHomeView firstName={firstName} kpis={kpis} counts={counts} recentLeads={recentLeads} rejectedCount={counts.rejected} />
}
