import { createAdminClient } from '@/lib/supabase/admin'
import { shouldEmail } from '@/lib/notification-events'
import { sendNotificationEmail } from '@/lib/email/notification-email'

interface NotifyArgs {
  /** Recipient user id */
  userId: string
  /** Event key — must match a key in the notification registry */
  event: string
  title: string
  body?: string
  link?: string
}

/**
 * Deliver a notification to a single user.
 * - Always inserts an in-app notification (the bell is always-on).
 * - Sends an email only if the user's saved preference (or the event default)
 *   allows it. Email failures never block the in-app delivery.
 */
export async function notify({ userId, event, title, body, link }: NotifyArgs) {
  const admin = createAdminClient()

  // 1. In-app (always)
  await admin.from('notifications').insert({
    user_id: userId,
    type: event,
    title,
    body: body ?? null,
    link: link ?? null,
  })

  // 2. Email (gated by preference)
  const { data: profile } = await admin
    .from('profiles')
    .select('email, full_name, notification_prefs')
    .eq('id', userId)
    .single()

  if (!profile?.email) return

  if (shouldEmail(profile.notification_prefs as Record<string, boolean> | null, event)) {
    try {
      await sendNotificationEmail({
        to: profile.email,
        name: profile.full_name,
        title,
        body,
        link,
      })
    } catch (err) {
      console.error('[notify] email failed for', event, '-', err)
    }
  }
}

/**
 * Deliver a notification to every admin (in-app always; email per each admin's
 * own preference, sent to their personal address).
 */
export async function notifyAdmins({
  type,
  title,
  body,
  link,
}: {
  type: string
  title: string
  body?: string
  link?: string
}) {
  const admin = createAdminClient()

  const { data: admins } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (!admins?.length) return

  await Promise.all(
    admins.map(a => notify({ userId: a.id, event: type, title, body, link })),
  )
}
