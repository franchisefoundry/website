import { Badge } from '@/components/ui/badge'
import { createAdminClient } from '@/lib/supabase/admin'

/** Loads an agent (introducer) with derived performance metrics + referred leads. */
export async function getAgentData(id: string) {
  const admin = createAdminClient()
  const [{ data: agent }, { data: leads }, { data: commissions }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, phone, referral_code, setup_complete, created_at').eq('id', id).eq('role', 'introducer').single(),
    admin.from('introducer_leads').select('first_name, last_name, status, created_at').eq('introducer_id', id).order('created_at', { ascending: false }),
    admin.from('introducer_commissions').select('commission_amount, status').eq('introducer_id', id),
  ])
  const L = leads ?? []
  const registered = L.filter(l => ['invited', 'registered', 'matched', 'intro_made'].includes(l.status)).length
  const commission = (commissions ?? []).reduce((n, c) => n + (c.commission_amount ?? 0), 0)
  return {
    agent, leads: L,
    metrics: {
      total: L.length,
      registered,
      conv: L.length ? Math.round((registered / L.length) * 100) : 0,
      commission,
    },
  }
}

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'

const MAP: Record<string, { label: string; variant: Variant }> = {
  submitted:  { label: 'Not invited', variant: 'warning' },
  invited:    { label: 'Invited',     variant: 'info' },
  registered: { label: 'Registered',  variant: 'success' },
  matched:    { label: 'Matched',     variant: 'gold' },
  intro_made: { label: 'Intro made',  variant: 'gold' },
  rejected:   { label: 'Rejected',    variant: 'danger' },
}

/** Status pill for an introducer_lead. */
export function candPill(status: string) {
  const m = MAP[status] ?? { label: status, variant: 'default' as Variant }
  return <Badge variant={m.variant}>{m.label}</Badge>
}
