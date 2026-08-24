import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { getClientThread } from '@/lib/client-thread'
import { ClientComposer } from './ClientComposer'
import { BellIcon } from '@/components/icons'

function time(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

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

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.04)] flex flex-col overflow-hidden" style={{ minHeight: '60vh' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-ink-3 bg-surface-2 border-b border-line-2">
        <BellIcon className="w-3.5 h-3.5" /> Replies reach the FF team and push to their inbox.
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
        {list.length === 0 ? (
          <p className="text-center text-sm text-ink-3 my-auto">No messages yet — say hello 👋</p>
        ) : list.map(m => (
          <div key={m.id} className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${
            m.from_admin
              ? 'self-start bg-surface-2 border border-line-2 rounded-bl-md text-ink'
              : 'self-end bg-ff-green text-white rounded-br-md'
          }`}>
            {m.body}
            <div className={`text-[10.5px] mt-1 ${m.from_admin ? 'text-ink-3' : 'text-white/60'}`}>
              {m.from_admin ? 'Franchise Foundry' : 'You'} · {time(m.created_at)}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-line-2">
        <ClientComposer />
      </div>
    </div>
  )
}
