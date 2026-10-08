import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'

export interface ViewMessage {
  id: string
  body: string
  mine: boolean
  author: string
  at: string
}

function time(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Right-hand pane of the Inbox: header, message bubbles, composer. */
export function ConversationView({
  title,
  subtitle,
  square,
  avatar,
  backHref,
  messages,
  composer,
  emptyText = 'No messages yet. Say hello.',
}: {
  title: string
  subtitle?: string
  square?: boolean
  avatar?: React.ReactNode
  backHref: string
  messages: ViewMessage[]
  composer: React.ReactNode
  emptyText?: string
}) {
  return (
    <>
      <div className="px-4 md:px-5 py-3 border-b border-line-2 flex items-center gap-3 flex-shrink-0">
        <Link href={backHref} className="md:hidden text-ink-3 hover:text-ink text-lg leading-none pr-1" aria-label="Back to conversations">‹</Link>
        {avatar ?? <Avatar name={title} size="md" square={square} />}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{title}</p>
          {subtitle && <p className="text-[11px] text-ink-3 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-2.5">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-3 text-center my-auto">{emptyText}</p>
        ) : messages.map(m => (
          <div key={m.id} className={`max-w-[82%] xl:max-w-[65%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug whitespace-pre-wrap ${
            m.mine ? 'self-end bg-ff-green text-white rounded-br-md' : 'self-start bg-surface-2 border border-line-2 rounded-bl-md text-ink'
          }`}>
            {m.body}
            <div className={`text-[10.5px] mt-1 ${m.mine ? 'text-white/60' : 'text-ink-3'}`}>{m.mine ? 'You' : m.author} · {time(m.at)}</div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-line-2 flex-shrink-0">{composer}</div>
    </>
  )
}

export function EmptyPane({ text }: { text: string }) {
  return <div className="flex-1 grid place-items-center p-8 text-sm text-ink-3 text-center">{text}</div>
}
