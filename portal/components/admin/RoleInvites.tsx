import { createAdminClient } from '@/lib/supabase/admin'
import InvitesList, { type InviteRow } from './InvitesList'

/**
 * Per-role invites list. Deduplicates to the most recent invite per email and
 * marks those whose owner has completed setup as accepted. Rendered on each
 * role's dedicated invites page (Franchisors / Franchisees / Agents).
 */
export default async function RoleInvites({ role }: { role: string }) {
  const admin = createAdminClient()

  const [{ data: rawInvites }, { data: completed }] = await Promise.all([
    admin
      .from('invites')
      .select('id, email, role, full_name, created_at, invite_expires_at')
      .eq('role', role)
      .order('created_at', { ascending: false }),
    admin
      .from('profiles')
      .select('email')
      .eq('role', role)
      .eq('setup_complete', true),
  ])

  const acceptedEmails = new Set((completed ?? []).map(p => p.email?.toLowerCase()))

  const seen = new Set<string>()
  const invites: InviteRow[] = []
  for (const inv of rawInvites ?? []) {
    const key = inv.email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    invites.push({ ...inv, accepted: acceptedEmails.has(key) })
  }

  const pending = invites.filter(i => !i.accepted && i.invite_expires_at && new Date(i.invite_expires_at) >= new Date()).length

  return (
    <div>
      {pending > 0 && (
        <p className="text-xs text-slate-500 mb-3">{pending} invite{pending === 1 ? '' : 's'} awaiting acceptance</p>
      )}
      <InvitesList invites={invites} />
    </div>
  )
}
