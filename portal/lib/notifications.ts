import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Insert a notification row for every admin in the system.
 * Uses the service-role client so it bypasses RLS.
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

  await admin.from('notifications').insert(
    admins.map(a => ({
      user_id: a.id,
      type,
      title,
      body:    body ?? null,
      link:    link ?? null,
    }))
  )
}
