import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import InviteUserButton from '../invite-user-button'
import InvitesList, { type InviteRow } from './InvitesList'

export default async function InvitesPage() {
  const admin = createAdminClient()

  // Fetch all invites (most recent first, deduplicated by email — keep latest per email)
  const { data: rawInvites } = await admin
    .from('invites')
    .select('id, email, role, full_name, created_at, invite_expires_at')
    .order('created_at', { ascending: false })

  // Fetch emails of users who have completed setup (accepted their invite)
  const { data: completedProfiles } = await admin
    .from('profiles')
    .select('email')
    .eq('setup_complete', true)

  const acceptedEmails = new Set((completedProfiles ?? []).map(p => p.email?.toLowerCase()))

  // Deduplicate — one row per email, using the most recent invite
  const seen = new Set<string>()
  const invites: InviteRow[] = []
  for (const invite of rawInvites ?? []) {
    if (seen.has(invite.email)) continue
    seen.add(invite.email)
    invites.push({
      ...invite,
      accepted: acceptedEmails.has(invite.email.toLowerCase()),
    })
  }

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
      <div className="flex gap-3 mb-6">
        {[
          { label: 'Accepted', count: accepted, colour: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'Pending',  count: pending,  colour: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'Expired',  count: expired,  colour: 'text-red-600 bg-red-50 border-red-200' },
        ].map(({ label, count, colour }) => (
          <div key={label} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${colour}`}>
            <span className="text-base font-bold tabular-nums">{count}</span>
            {label}
          </div>
        ))}
      </div>

      <InvitesList invites={invites} />
    </div>
  )
}
