import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notifications'

/**
 * POST /api/admin/messages  { thread_type, thread_id, body }
 * Sends a message from the admin into a record's thread and notifies the
 * recipient. Used by the in-drawer composer (returns JSON, no redirect).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { thread_type, thread_id, body } = await req.json().catch(() => ({}))
  const text = String(body ?? '').trim()
  if (!thread_type || !thread_id || !text) return NextResponse.json({ error: 'Invalid message' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('messages').insert({ thread_type, thread_id, body: text, from_admin: true, sender_id: user.id })

  let recipientId: string | null = null
  if (thread_type === 'introducer') recipientId = thread_id
  else {
    const table = thread_type === 'franchisee' ? 'franchisee_profiles' : 'franchisor_profiles'
    const { data } = await admin.from(table).select('user_id').eq('id', thread_id).single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recipientId = (data as any)?.user_id ?? null
  }
  if (recipientId) {
    try {
      await notify({ userId: recipientId, event: 'new_message', title: 'New message from Franchise Foundry', body: text.length > 140 ? `${text.slice(0, 140)}…` : text, link: `/${thread_type}` })
    } catch (e) { console.error('[messages] notify failed', e) }
  }

  return NextResponse.json({ success: true })
}
