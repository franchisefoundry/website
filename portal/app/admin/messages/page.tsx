import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Inbox, type InboxItem, type DirectoryEntry } from '@/components/messages/Inbox'
import { ConversationView, EmptyPane } from '@/components/messages/ConversationView'
import { Composer } from '@/components/messages/Composer'
import { allowedContacts, findConversation, listConversations, openConversation } from '@/lib/direct-messages'

export const dynamic = 'force-dynamic'

const KIND: Record<string, string> = { franchisee: 'Franchisee', franchisor: 'Brand', introducer: 'Agent' }

/**
 * Admin inbox. Two kinds of conversation in one list:
 *   • client threads (?thread=type:id) — the shared Franchise Foundry inbox
 *     with a franchisee, brand or agent; every admin can see and reply.
 *   • direct messages (?dm=conversationId) — private admin ↔ admin chats.
 * ?to=<adminUserId> opens (or starts) a DM; ?compose=1 opens the directory.
 */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ thread?: string; dm?: string; to?: string; compose?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = createAdminClient()

  if (sp.to) {
    const existing = await findConversation(user.id, sp.to, admin)
    if (existing) redirect(`/admin/messages?dm=${existing}`)
  }

  const [{ data: messages }, { data: fes }, { data: brs }, { data: people }, team] = await Promise.all([
    admin.from('messages').select('id, thread_type, thread_id, body, from_admin, sender_id, read_at, created_at').order('created_at', { ascending: true }),
    admin.from('franchisee_profiles').select('id, profiles!franchisee_profiles_user_id_fkey(full_name, email, role)').is('archived_at', null),
    admin.from('franchisor_profiles').select('id, brand_name, contact_name').is('archived_at', null).not('brand_name', 'is', null),
    admin.from('profiles').select('id, full_name, email, role').in('role', ['introducer', 'admin']),
    allowedContacts(user.id, 'admin', admin),
  ])

  const M = messages ?? []
  const personName = new Map((people ?? []).map(p => [p.id, p.full_name || p.email || 'Admin']))

  // ── Client threads: names + directory ────────────────────────────────────
  const names = new Map<string, string>()
  const directory: DirectoryEntry[] = team.map(t => ({ key: `to:${t.userId}`, href: `/admin/messages?to=${t.userId}`, name: t.name, subtitle: 'Direct message', group: 'Team' }))
  for (const f of fes ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = f.profiles as any
    if (p?.role !== 'franchisee') continue
    const key = `franchisee:${f.id}`
    names.set(key, p.full_name || p.email || 'Franchisee')
    directory.push({ key, href: `/admin/messages?thread=${encodeURIComponent(key)}`, name: names.get(key)!, subtitle: p.email ?? undefined, group: 'Franchisees' })
  }
  for (const b of brs ?? []) {
    const key = `franchisor:${b.id}`
    names.set(key, b.brand_name || 'Brand')
    directory.push({ key, href: `/admin/messages?thread=${encodeURIComponent(key)}`, name: names.get(key)!, subtitle: b.contact_name ?? undefined, group: 'Brands', square: true })
  }
  for (const a of (people ?? []).filter(p => p.role === 'introducer')) {
    const key = `introducer:${a.id}`
    names.set(key, a.full_name || a.email || 'Agent')
    directory.push({ key, href: `/admin/messages?thread=${encodeURIComponent(key)}`, name: names.get(key)!, subtitle: a.email ?? undefined, group: 'Agents' })
  }

  const threads = new Map<string, InboxItem>()
  for (const m of M) {
    const key = `${m.thread_type}:${m.thread_id}`
    const t = threads.get(key) ?? {
      key, href: `/admin/messages?thread=${encodeURIComponent(key)}`,
      name: names.get(key) || 'Conversation', subtitle: KIND[m.thread_type], unread: 0,
      square: m.thread_type === 'franchisor',
    }
    t.preview = m.body
    t.at = m.created_at
    if (!m.from_admin && !m.read_at) t.unread = (t.unread ?? 0) + 1
    threads.set(key, t)
  }

  // ── Direct messages ──────────────────────────────────────────────────────
  const dms = await listConversations(user.id, team, admin)
  const items: InboxItem[] = [
    ...threads.values(),
    ...dms.map(c => ({
      key: `dm:${c.id}`, href: `/admin/messages?dm=${c.id}`,
      name: c.other?.name ?? 'Conversation', subtitle: 'Direct message',
      preview: c.lastBody, at: c.lastAt, unread: c.unread,
    })),
  ].sort((a, b) => ((a.at ?? '') < (b.at ?? '') ? 1 : -1))

  // ── Active pane ──────────────────────────────────────────────────────────
  let activeKey = ''
  let pane: React.ReactNode = <EmptyPane text="Pick a conversation, or start one with New message." />

  if (sp.dm) {
    const msgs = await openConversation(sp.dm, user.id, admin)
    const conv = dms.find(c => c.id === sp.dm)
    if (msgs) {
      activeKey = `dm:${sp.dm}`
      const other = conv?.other?.name ?? 'Conversation'
      pane = (
        <ConversationView title={other} subtitle="Direct message · only the two of you can see this" backHref="/admin/messages"
          messages={msgs.map(m => ({ id: m.id, body: m.body, mine: m.sender_id === user.id, author: other, at: m.created_at }))}
          composer={<Composer kind="dm" payload={{ conversation_id: sp.dm }} placeholder={`Message ${other.split(' ')[0]}…`} />} />
      )
    }
  } else if (sp.to) {
    const contact = team.find(t => t.userId === sp.to)
    if (contact) {
      activeKey = `to:${contact.userId}`
      pane = (
        <ConversationView title={contact.name} subtitle="Direct message · only the two of you can see this" backHref="/admin/messages" messages={[]}
          composer={<Composer kind="dm" payload={{ recipient_id: contact.userId }} redirectBase="/admin/messages?dm=" placeholder={`Message ${contact.name.split(' ')[0]}…`} />} />
      )
    }
  } else if (sp.thread) {
    const [type, id] = sp.thread.split(':')
    if (KIND[type] && id) {
      activeKey = sp.thread
      const clientName = names.get(sp.thread) || 'Conversation'
      const msgs = M.filter(m => m.thread_type === type && m.thread_id === id)
      // Mark the client's messages read so the nav badge clears
      await admin.from('messages').update({ read_at: new Date().toISOString() })
        .eq('thread_type', type).eq('thread_id', id).eq('from_admin', false).is('read_at', null)
      pane = (
        <ConversationView title={clientName} subtitle={`${KIND[type]} · shared team inbox`} square={type === 'franchisor'} backHref="/admin/messages"
          messages={msgs.map(m => ({
            id: m.id, body: m.body, at: m.created_at,
            mine: m.from_admin && m.sender_id === user.id,
            author: m.from_admin ? `${personName.get(m.sender_id ?? '') ?? 'Team'} (FF)` : clientName,
          }))}
          composer={<Composer kind="admin" payload={{ thread_type: type, thread_id: id }} placeholder={`Message ${clientName}…`} />} />
      )
    }
  }

  return (
    <div>
      <PageHeader title="Messages" description="Client conversations are shared across the team. Direct messages between admins are private." />
      <Inbox items={items} activeKey={activeKey} directory={directory} startInDirectory={sp.compose === '1'}>
        {pane}
      </Inbox>
    </div>
  )
}
