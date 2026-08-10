import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notifications'

type Audience = 'all' | 'franchisee' | 'franchisor' | 'introducer' | 'admin'
const AUDIENCES: Audience[] = ['all', 'franchisee', 'franchisor', 'introducer', 'admin']

/**
 * POST /api/admin/broadcast
 * Body: { audience, title, body?, link? }
 * Admin-only. Sends an "announcements" notification (in-app always; push/email
 * per each recipient's own announcement preference) to everyone in the audience.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { audience, title, body, link } = await req.json().catch(() => ({}))
  if (!AUDIENCES.includes(audience)) {
    return NextResponse.json({ error: 'Invalid audience.' }, { status: 400 })
  }
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'A title is required.' }, { status: 400 })
  }

  let query = admin.from('profiles').select('id')
  if (audience !== 'all') query = query.eq('role', audience)
  const { data: recipients, error } = await query
  if (error) return NextResponse.json({ error: 'Could not load recipients.' }, { status: 500 })
  if (!recipients?.length) return NextResponse.json({ success: true, sent: 0 })

  // Fan out. notify() gates push/email per user; in-app is always inserted.
  await Promise.allSettled(
    recipients.map(r =>
      notify({
        userId: r.id,
        event: 'announcements',
        title: title.trim(),
        body: typeof body === 'string' ? body.trim() : undefined,
        link: typeof link === 'string' && link.trim() ? link.trim() : undefined,
      }),
    ),
  )

  return NextResponse.json({ success: true, sent: recipients.length })
}
