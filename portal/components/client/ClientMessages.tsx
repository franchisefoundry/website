import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { getClientThread } from '@/lib/client-thread'
import { ClientComposer } from './ClientComposer'
import { MessageThread } from './MessageThread'

/** Two-way message thread between a client and the Franchise Foundry team. */
export async function ClientMessages() {
  const thread = await getClientThread()

  return (
    <div className="max-w-3xl">
      <PageHeader title="Messages" description="Chat directly with the Franchise Foundry team." />

      {!thread ? (
        <div className="text-center py-16 text-ink-3 text-sm">Your conversation will appear here once your account is set up.</div>
      ) : (
        <ThreadBody threadType={thread.threadType} threadId={thread.threadId} />
      )}
    </div>
  )
}

async function ThreadBody({ threadType, threadId }: { threadType: string; threadId: string }) {
  const admin = createAdminClient()
  const { data: messages } = await admin
    .from('messages')
    .select('id, body, from_admin, created_at')
    .eq('thread_type', threadType).eq('thread_id', threadId)
    .order('created_at')

  // Mark the team's messages as read now that the client is viewing them.
  await admin.from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_type', threadType).eq('thread_id', threadId)
    .eq('from_admin', true).is('read_at', null)

  const list = messages ?? []

  return <MessageThread messages={list} composer={<ClientComposer />} />
}
