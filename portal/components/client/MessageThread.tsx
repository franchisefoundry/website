import { BellIcon } from '@/components/icons'

export interface ThreadMessage {
  id: string
  body: string
  from_admin: boolean
  created_at: string
}

function time(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Presentational two-way message thread — shared by the real page and /design-preview. */
export function MessageThread({ messages, composer }: { messages: ThreadMessage[]; composer: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.04)] flex flex-col overflow-hidden" style={{ minHeight: '60vh' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-ink-3 bg-surface-2 border-b border-line-2">
        <BellIcon className="w-3.5 h-3.5" /> Replies reach the FF team and push to their inbox.
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-ink-3 my-auto">No messages yet — say hello 👋</p>
        ) : messages.map(m => (
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

      <div className="p-3 border-t border-line-2">{composer}</div>
    </div>
  )
}
