import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientThread } from '@/lib/client-thread'
import { notify } from '@/lib/notifications'
import { threadAdminIds } from '@/lib/direct-messages'

/**
 * POST /api/messages  { body }
 * A client (franchisee / brand / agent) sends a message on their own thread.
 * Server-mediated (messages are admin-RLS); the thread is resolved from the
 * signed-in user, so a client can only ever post to their own conversation.
 * Only the admins already handling this thread are notified (everyone, if
 * nobody has picked it up yet).
 */
export async function POST(req: NextRequest) {
  const thread = await getClientThread()
  if (!thread) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { body } = await req.json().catch(() => ({}))
  if (!body || !String(body).trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })
  const text = String(body).trim().slice(0, 4000)

  const admin = createAdminClient()
  const { error } = await admin.from('messages').insert({
    thread_type: thread.threadType,
    thread_id: thread.threadId,
    body: text,
    from_admin: false,
    sender_id: thread.userId,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    const adminIds = await threadAdminIds(thread.threadType, thread.threadId, admin)
    await Promise.all(adminIds.map(userId => notify({
      userId,
      event: 'new_message',
      title: `New message from ${thread.name}`,
      body: text.slice(0, 120),
      link: `/admin/messages?thread=${thread.threadType}:${thread.threadId}`,
    })))
  } catch (e) { console.error('[messages] notify admins failed', e) }

  return NextResponse.json({ success: true })
}
