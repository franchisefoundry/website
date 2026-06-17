import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import InviteUserButton from '../invite-user-button'
import InvitesList, { type InviteRow } from './InvitesList'

const SEGMENTS = [
  { role: 'franchisee', label: 'Franchisees' },
  { role: 'franchisor', label: 'Franchisors' },
  { role: 'introducer', label: 'Agents' },
  { role: 'admin',      label: 'Admins' },
] as const

export default async function InvitesPage() {
  const admin = createAdminClient()

  const { data: rawInvites } = await admin
    .from('invites')
    .select('id, email, role, full_name, created_at, invite_expires_at')
    .order('created_at', { ascending: false })

  // Emails of users who have completed setup = accepted their invite
  const { data: completedProfiles } = await admin
    .from('profiles')
    .select('email')
    .eq('setup_complete', true)

  const acceptedEmails = new Set((completedProfiles ?? []).map(p => p.email?.toLowerCase()))

  // Deduplicate per email — keep the most recent invite for each
  const seen = new Set<string>()
  const invites: InviteRow[] = []
  for (const invite of rawInvites ?? []) {
    const key = `${invite.email}::${invite.role}`
    if (seen.has(key)) continue
    seen.add(key)
    invites.push({
      ...invite,
      accepted: acceptedEmails.has(invite.email.toLowerCase()),
    })
  }

  const total   = invites.length
  const pending  = invites.filter(i => !i.accepted && i.invite_expires_at && new Date(i.invite_expires_at) >= new Date()).length
  const expired  = invites.filter(i => !i.accepted && (!i.invite_expires_at || new Date(i.invite_expires_at) < new Date())).length
  const accepted = invites.filter(i => i.accepted).length

  return (
    <div>
      <PageHeader
        title="Invites"
        description="Track and manage portal access invitations."
        action={<InviteUserButton />}
      />

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { label: 'Total',    count: total,    colour: 'text-slate-600 bg-slate-50 border-slate-200' },
          { label: 'Accepted', count: accepted, colour: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'Pending',  count: pending,  colour: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'Expired',  count: expired,  colour: 'text-red-600 bg-red-50 border-red-200' },
        ].map(({ label, count, colour }) => (
          <div key={label} className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${colour}`}>
            <span className="text-sm font-bold tabular-nums">{count}</span>
            {label}
          </div>
        ))}
      </div>

      {/* Per-segment sections */}
      <div className="space-y-10">
        {SEGMENTS.map(({ role, label }) => {
          const segment = invites.filter(i => i.role === role)
          if (segment.length === 0) return null
          return (
            <section key={role}>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                {label}
                <span className="text-xs font-normal text-slate-400">{segment.length}</span>
              </h2>
              <InvitesList invites={segment} />
            </section>
          )
        })}

        {invites.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-16">No invites sent yet.</p>
        )}
      </div>
    </div>
  )
}
