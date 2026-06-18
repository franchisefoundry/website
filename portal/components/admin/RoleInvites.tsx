import { createAdminClient } from '@/lib/supabase/admin'
import InvitesList, { type InviteRow } from './InvitesList'

/**
 * Per-role invites section, shown under each people list (Franchisors,
 * Franchisees, Agents). Deduplicates to the most recent invite per email and
 * marks those whose owner has completed setup as accepted.
 */
export default async function RoleInvites({ role, title = 'Invites' }: { role: string; title?: string }) {
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
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {pending > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
            {pending} pending
          </span>
        )}
      </div>
      <InvitesList invites={invites} />
    </section>
  )
}
