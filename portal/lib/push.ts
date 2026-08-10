import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Web Push sender. Uses the VAPID keys from env — no third-party service.
 *
 * Env required (see .env.local.example):
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  — the application server public key
 *   VAPID_PRIVATE_KEY             — the matching private key (server-only)
 *   VAPID_SUBJECT                 — a mailto: or https: contact URL
 */

let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:connect@franchisefoundry.co.uk'
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

interface PushPayload {
  title: string
  body?: string
  link?: string
  tag?: string
}

/**
 * Push to every device the user has registered. Silently no-ops if push isn't
 * configured (keys absent) so the rest of notify() is never blocked. Prunes
 * subscriptions the push service reports as gone (404 / 410).
 */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs?.length) return

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    link: payload.link ?? '/',
    tag: payload.tag,
  })

  const stale: string[] = []

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          stale.push(s.endpoint)
        } else {
          console.error('[push] send failed', status, err)
        }
      }
    }),
  )

  if (stale.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', stale)
  }
}
