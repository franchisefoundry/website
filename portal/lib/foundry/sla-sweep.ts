/**
 * The 15-minute SLA sweep. Each nudge fires once per intro (guarded by an
 * internal intro_events row of the same kind).
 *   - to_brief past its brief deadline       → team: "Overdue: brief X"
 *   - briefed 24h with no contact             → team: "Chase X"
 *   - in contact for 7 days                   → move to outcome, ask the member
 *   - website requests unconfirmed for 7 days → expired
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyFoundryTeam } from './notify'
import { performIntroAction } from './pipeline'

const OUTCOME_AFTER_DAYS = 7
const UNVERIFIED_EXPIRE_DAYS = 7

export async function runSlaSweep(admin: SupabaseClient) {
  const now = new Date()
  const iso = now.toISOString()
  const outcomeCutoff = new Date(now.getTime() - OUTCOME_AFTER_DAYS * 86_400_000).toISOString()

  const [{ data: overdue }, { data: chase }, { data: stale }] = await Promise.all([
    admin.from('intro_requests').select('id, is_demo, partners(name), profiles!intro_requests_requester_id_fkey(full_name)')
      .eq('stage', 'to_brief').lt('sla_due_at', iso).limit(200),
    admin.from('intro_requests').select('id, is_demo, partners(name), profiles!intro_requests_requester_id_fkey(full_name)')
      .eq('stage', 'briefed').lt('sla_due_at', iso).limit(200),
    admin.from('intro_requests').select('id').eq('stage', 'in_contact').lt('contacted_at', outcomeCutoff).limit(200),
  ])

  const ids = [...(overdue ?? []), ...(chase ?? [])].map(r => r.id)
  const { data: done } = ids.length
    ? await admin.from('intro_events').select('intro_request_id, kind').in('intro_request_id', ids).in('kind', ['sla_overdue', 'chase_due'])
    : { data: [] as { intro_request_id: string; kind: string }[] }
  const already = new Set((done ?? []).map(e => `${e.kind}:${e.intro_request_id}`))

  let flagged = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const label = (r: any) => `${r.profiles?.full_name ?? 'A member'} → ${r.partners?.name ?? 'partner'}`

  for (const r of overdue ?? []) {
    if (already.has(`sla_overdue:${r.id}`)) continue
    await admin.from('intro_events').insert({ intro_request_id: r.id, kind: 'sla_overdue', body: 'Brief deadline passed', visible_to_requester: false })
    await notifyFoundryTeam({ event: 'intro_request', title: `Overdue: brief ${label(r)}`, body: 'Past the 4 working hour target.', link: '/admin/intro-requests' }, { demo: r.is_demo })
    flagged++
  }
  for (const r of chase ?? []) {
    if (already.has(`chase_due:${r.id}`)) continue
    await admin.from('intro_events').insert({ intro_request_id: r.id, kind: 'chase_due', body: 'No contact 24h after briefing', visible_to_requester: false })
    await notifyFoundryTeam({ event: 'intro_request', title: `Chase: ${label(r)}`, body: 'Briefed 24h ago with no contact yet.', link: '/admin/intro-requests' }, { demo: r.is_demo })
    flagged++
  }
  for (const r of stale ?? []) {
    await performIntroAction(admin, r.id, { action: 'ask_outcome' }, { id: null, name: 'Automatic' })
    flagged++
  }
  // Website requests never confirmed by email: expire after a week.
  const expireCutoff = new Date(now.getTime() - UNVERIFIED_EXPIRE_DAYS * 86_400_000).toISOString()
  const { data: expired } = await admin.from('intro_requests')
    .update({ stage: 'expired', status: 'completed', closed_at: iso, updated_at: iso })
    .eq('stage', 'awaiting_verification').lt('created_at', expireCutoff).select('id')

  return { expired: expired?.length ?? 0, overdue: overdue?.length ?? 0, chase: chase?.length ?? 0, outcome: stale?.length ?? 0, actioned: flagged }
}
