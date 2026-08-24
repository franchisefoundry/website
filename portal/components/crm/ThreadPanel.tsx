import { formatDate } from '@/lib/utils'
import { DrawerMessageComposer } from './DrawerMessageComposer'

interface Msg { id: string; body: string; from_admin: boolean; created_at: string }

export function ThreadPanel({
  messages, threadType, threadId, who,
}: {
  messages: Msg[]
  threadType: 'franchisee' | 'franchisor' | 'introducer'
  threadId: string
  who: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[11.5px] text-ink-3 bg-surface-2 border border-line-2 rounded-lg px-3 py-2 mb-3">
        <span>🔔</span> Replies reach {who} in their portal inbox and push to the app.
      </div>
      <div className="space-y-2.5">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-3 text-center py-6">No messages yet — start the conversation below.</p>
        ) : messages.map(m => (
          <div key={m.id} className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm ${m.from_admin ? 'ml-auto bg-ff-green text-white rounded-br-md' : 'bg-surface-2 border border-line-2 rounded-bl-md'}`}>
            {m.body}
            <div className={`text-[10.5px] mt-1 ${m.from_admin ? 'text-white/60' : 'text-ink-3'}`}>{m.from_admin ? 'You' : who} · {formatDate(m.created_at)}</div>
          </div>
        ))}
      </div>
      <DrawerMessageComposer threadType={threadType} threadId={threadId} who={who} />
    </div>
  )
}
