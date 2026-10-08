import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { getClientThread } from '@/lib/client-thread'
import { Inbox, type InboxItem, type DirectoryEntry } from '@/components/messages/Inbox'
import { ConversationView, EmptyPane } from '@/components/messages/ConversationView'
import { Composer } from '@/components/messages/Composer'
import { allowedContacts, findConversation, listConversations, openConversation } from '@/lib/direct-messages'

const FF_AVATAR = (
  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ff-green to-ff-green-deep text-white grid place-items-center font-bold text-[11px] shrink-0">FF</div>
)

/**
 * Client inbox (franchisee / brand / agent):
 *   • ?c=team  — their thread with the Franchise Foundry team (always there)
 *   • ?c=<id>  — a direct conversation with an introduced match
 *   • ?to=<userId> — open/start a chat with someone in their directory
 * The directory only lists people they're allowed to message (see lib/direct-messages).
 */
export async function ClientMessages({ params }: { params: { c?: string; to?: string; compose?: string } }) {
  const thread = await getClientThread()

  if (!thread) {
    return (
      <div>
        <PageHeader title="Messages" description="Chat with the Franchise Foundry team." />
        <div className="text-center py-16 text-ink-3 text-sm">Your conversation will appear here once your account is set up.</div>
      </div>
    )
  }

  const base = `/${thread.role}/messages`
  const admin = createAdminClient()

  if (params.to) {
    const existing = await findConversation(thread.userId, params.to, admin)
    if (existing) redirect(`${base}?c=${existing}`)
  }

  const [contacts, { data: teamMsgs }] = await Promise.all([
    allowedContacts(thread.userId, thread.role, admin),
    admin.from('messages').select('id, body, from_admin, read_at, created_at')
      .eq('thread_type', thread.threadType).eq('thread_id', thread.threadId).order('created_at'),
  ])
  const dms = await listConversations(thread.userId, contacts, admin)
  const team = teamMsgs ?? []
  const lastTeam = team[team.length - 1]

  const teamItem: InboxItem = {
    key: 'team', href: `${base}?c=team`, name: 'Franchise Foundry team', subtitle: 'Your direct line to the team',
    preview: lastTeam?.body, at: lastTeam?.created_at, square: true,
    unread: team.filter(m => m.from_admin && !m.read_at).length,
  }
  const items: InboxItem[] = [
    teamItem,
    ...dms.map(c => ({
      key: c.id, href: `${base}?c=${c.id}`, name: c.other?.name ?? 'Conversation', subtitle: c.other?.subtitle,
      preview: c.lastBody, at: c.lastAt, unread: c.unread, square: c.other?.kind === 'brand',
    })),
  ]
  const directory: DirectoryEntry[] = [
    { key: 'team', href: `${base}?c=team`, name: 'Franchise Foundry team', group: 'Franchise Foundry', square: true },
    ...contacts.map(c => ({
      key: `to:${c.userId}`, href: `${base}?to=${c.userId}`, name: c.name, subtitle: c.subtitle,
      group: c.kind === 'brand' ? 'Your introduced brands' : 'Your introduced candidates', square: c.kind === 'brand',
    })),
  ]

  // Default to the team thread on desktop-sized first load
  const active = params.c ?? (params.to ? '' : 'team')
  let activeKey = ''
  let pane: React.ReactNode = <EmptyPane text="Pick a conversation." />

  if (active === 'team') {
    activeKey = 'team'
    await admin.from('messages').update({ read_at: new Date().toISOString() })
      .eq('thread_type', thread.threadType).eq('thread_id', thread.threadId).eq('from_admin', true).is('read_at', null)
    pane = (
      <ConversationView title="Franchise Foundry team" subtitle="Replies reach the whole team" avatar={FF_AVATAR} backHref={`${base}?c=`}
        emptyText="No messages yet. Send the team a message to get started."
        messages={team.map(m => ({ id: m.id, body: m.body, mine: !m.from_admin, author: 'Franchise Foundry', at: m.created_at }))}
        composer={<Composer kind="client" placeholder="Message the Franchise Foundry team…" />} />
    )
  } else if (active) {
    const msgs = await openConversation(active, thread.userId, admin)
    const conv = dms.find(c => c.id === active)
    if (msgs) {
      activeKey = active
      const name = conv?.other?.name ?? 'Conversation'
      pane = (
        <ConversationView title={name} subtitle={conv?.other?.subtitle} square={conv?.other?.kind === 'brand'} backHref={`${base}?c=`}
          messages={msgs.map(m => ({ id: m.id, body: m.body, mine: m.sender_id === thread.userId, author: name, at: m.created_at }))}
          composer={<Composer kind="dm" payload={{ conversation_id: active }} placeholder={`Message ${name}…`} />} />
      )
    }
  } else if (params.to) {
    const contact = contacts.find(c => c.userId === params.to)
    if (contact) {
      activeKey = `to:${contact.userId}`
      pane = (
        <ConversationView title={contact.name} subtitle={contact.subtitle} square={contact.kind === 'brand'} backHref={`${base}?c=`} messages={[]}
          composer={<Composer kind="dm" payload={{ recipient_id: contact.userId }} redirectBase={`${base}?c=`} placeholder={`Message ${contact.name}…`} />} />
      )
    }
  }

  const description = thread.role === 'introducer'
    ? 'Chat directly with the Franchise Foundry team.'
    : `Chat with the Franchise Foundry team, and with ${thread.role === 'franchisor' ? 'candidates' : 'brands'} once we've introduced you.`

  return (
    <div>
      <PageHeader title="Messages" description={description} />
      <Inbox items={items} activeKey={activeKey} directory={directory} startInDirectory={params.compose === '1'}
        emptyDirectoryText="Once we introduce you to a match, they'll appear here.">
        {pane}
      </Inbox>
    </div>
  )
}
