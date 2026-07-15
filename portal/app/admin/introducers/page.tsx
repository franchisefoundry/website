import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import InviteAgentButton from './InviteIntroducerButton'
import AgentsTable from './AgentsTable'
import { ensureReferralCode } from '@/lib/referral'

export default async function AdminIntroducersPage() {
  const admin = createAdminClient()

  const { data: introducers } = await admin
    .from('profiles')
    .select('id, full_name, email, phone, referral_code, created_at')
    .eq('role', 'introducer')
    .order('created_at', { ascending: false })

  // Ensure every agent has a referral code so the admin can share it immediately
  await Promise.all(
    (introducers ?? [])
      .filter(a => !a.referral_code)
      .map(async a => {
        a.referral_code = await ensureReferralCode(admin, a.id)
      }),
  )

  // Get lead counts per agent
  const { data: leadCounts } = await admin
    .from('introducer_leads')
    .select('introducer_id, status')

  const countsByAgent: Record<string, { total: number; pending: number; active: number }> = {}
  ;(leadCounts ?? []).forEach(l => {
    if (!countsByAgent[l.introducer_id]) {
      countsByAgent[l.introducer_id] = { total: 0, pending: 0, active: 0 }
    }
    countsByAgent[l.introducer_id].total++
    if (l.status === 'submitted') countsByAgent[l.introducer_id].pending++
    if (['invited', 'registered', 'matched', 'intro_made'].includes(l.status)) countsByAgent[l.introducer_id].active++
  })

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Manage agent accounts and their pipeline."
        action={<InviteAgentButton />}
      />

      {(introducers ?? []).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-3xl mb-3">👤</div>
          <p className="text-slate-800 font-semibold text-sm mb-1">No agents yet</p>
          <p className="text-slate-400 text-xs">Use the button above to invite your first agent.</p>
        </div>
      ) : (
        <AgentsTable agents={introducers ?? []} countsByAgent={countsByAgent} />
      )}
    </div>
  )
}
