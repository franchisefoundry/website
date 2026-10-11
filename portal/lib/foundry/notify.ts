/**
 * Team notifications for The Foundry. In preview, demo activity only reaches
 * the people on FOUNDRY_PREVIEW_EMAILS, never the whole admin team.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { notify, notifyAdmins } from '@/lib/notifications'

interface TeamNotice {
  event: string
  title: string
  body?: string
  link?: string
}

export async function notifyFoundryTeam(notice: TeamNotice, { demo }: { demo: boolean }) {
  if (!demo) {
    await notifyAdmins({ type: notice.event, title: notice.title, body: notice.body, link: notice.link })
    return
  }
  const emails = (process.env.FOUNDRY_PREVIEW_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (!emails.length) return
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('id, email').in('email', emails)
  await Promise.all((data ?? []).map(p => notify({
    userId: p.id,
    event: notice.event,
    title: `[Demo] ${notice.title}`,
    body: notice.body,
    link: notice.link,
  })))
}
