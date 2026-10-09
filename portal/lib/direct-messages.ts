import { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notifications'

/**
 * Person-to-person messaging (tables from migration 007).
 *
 * Who can message whom:
 *   • admin      ↔ any other admin
 *   • franchisee ↔ a brand, only once an admin has revealed that match
 *     (matches.franchisor_revealed). Same rule from the brand's side.
 *   • brand ↔ brand, franchisee ↔ franchisee and agents: never. They talk to
 *     the Franchise Foundry team through their normal thread instead.
 * The rule is re-checked on every send, so un-revealing a match closes the chat.
 */

export interface Contact {
  userId: string
  name: string
  subtitle: string
  kind: 'team' | 'franchisee' | 'brand'
}

export interface ConversationSummary {
  id: string
  other: Contact | null
  lastBody: string
  lastAt: string
  unread: number
}

type Admin = ReturnType<typeof createAdminClient>

/** Everyone `userId` is allowed to start or continue a direct conversation with. */
export async function allowedContacts(userId: string, role: string, admin: Admin = createAdminClient()): Promise<Contact[]> {
  if (role === 'admin') {
    const { data } = await admin.from('profiles').select('id, full_name, email').eq('role', 'admin').is('archived_at', null).neq('id', userId)
    return (data ?? []).map(p => ({ userId: p.id, name: p.full_name || p.email || 'Admin', subtitle: 'Franchise Foundry team', kind: 'team' as const }))
  }

  if (role === 'franchisee') {
    const { data: mine } = await admin.from('franchisee_profiles').select('id').eq('user_id', userId)
    const ids = (mine ?? []).map(r => r.id)
    if (!ids.length) return []
    const { data: matches } = await admin.from('matches')
      .select('franchisor_profiles(user_id, brand_name, contact_name, archived_at)')
      .in('franchisee_id', ids).eq('franchisor_revealed', true)
    const out = new Map<string, Contact>()
    for (const m of matches ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = m.franchisor_profiles as any
      if (!b?.user_id || b.archived_at) continue
      out.set(b.user_id, { userId: b.user_id, name: b.brand_name || 'Brand', subtitle: b.contact_name ? `Brand · ${b.contact_name}` : 'Brand', kind: 'brand' })
    }
    return [...out.values()]
  }

  if (role === 'franchisor') {
    const { data: mine } = await admin.from('franchisor_profiles').select('id').eq('user_id', userId)
    const ids = (mine ?? []).map(r => r.id)
    if (!ids.length) return []
    const { data: matches } = await admin.from('matches')
      .select('franchisee_profiles(user_id, archived_at, profiles!franchisee_profiles_user_id_fkey(full_name))')
      .in('franchisor_id', ids).eq('franchisor_revealed', true)
    const out = new Map<string, Contact>()
    for (const m of matches ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f = m.franchisee_profiles as any
      if (!f?.user_id || f.archived_at) continue
      out.set(f.user_id, { userId: f.user_id, name: f.profiles?.full_name || 'Candidate', subtitle: 'Matched candidate', kind: 'franchisee' })
    }
    return [...out.values()]
  }

  return []
}

export async function canMessage(senderId: string, senderRole: string, recipientId: string, admin: Admin = createAdminClient()) {
  const contacts = await allowedContacts(senderId, senderRole, admin)
  return contacts.some(c => c.userId === recipientId)
}

/** The existing 1:1 conversation between two users, or null. */
export async function findConversation(a: string, b: string, admin: Admin = createAdminClient()) {
  const { data: mine } = await admin.from('conversation_members').select('conversation_id').eq('user_id', a)
  const ids = (mine ?? []).map(r => r.conversation_id)
  if (!ids.length) return null
  const { data: theirs } = await admin.from('conversation_members').select('conversation_id').eq('user_id', b).in('conversation_id', ids).limit(1)
  return theirs?.[0]?.conversation_id ?? null
}

/** Conversations `userId` belongs to, newest first, with the other person + unread count. */
export async function listConversations(userId: string, contacts: Contact[], admin: Admin = createAdminClient()): Promise<ConversationSummary[]> {
  const { data: memberships } = await admin.from('conversation_members').select('conversation_id, last_read_at').eq('user_id', userId)
  if (!memberships?.length) return []
  const ids = memberships.map(m => m.conversation_id)
  const lastRead = new Map(memberships.map(m => [m.conversation_id, m.last_read_at as string | null]))

  const [{ data: members }, { data: msgs }] = await Promise.all([
    admin.from('conversation_members').select('conversation_id, user_id, profiles(full_name, email, role)').in('conversation_id', ids).neq('user_id', userId),
    admin.from('direct_messages').select('conversation_id, sender_id, body, created_at').in('conversation_id', ids).order('created_at'),
  ])

  const known = new Map(contacts.map(c => [c.userId, c]))
  const others = new Map<string, Contact>()
  for (const m of members ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = m.profiles as any
    others.set(m.conversation_id, known.get(m.user_id) ?? {
      userId: m.user_id,
      name: p?.full_name || p?.email || 'Unknown',
      subtitle: p?.role === 'admin' ? 'Franchise Foundry team' : 'No longer connected',
      kind: p?.role === 'admin' ? 'team' : p?.role === 'franchisor' ? 'brand' : 'franchisee',
    })
  }

  const byConv = new Map<string, ConversationSummary>()
  for (const id of ids) byConv.set(id, { id, other: others.get(id) ?? null, lastBody: '', lastAt: '', unread: 0 })
  for (const m of msgs ?? []) {
    const s = byConv.get(m.conversation_id)!
    s.lastBody = m.body
    s.lastAt = m.created_at
    const read = lastRead.get(m.conversation_id)
    if (m.sender_id !== userId && (!read || m.created_at > read)) s.unread++
  }
  return [...byConv.values()].filter(c => c.lastAt).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))
}

/** Messages in a conversation the user belongs to (null if they don't), marking it read. */
export async function openConversation(conversationId: string, userId: string, admin: Admin = createAdminClient()) {
  const { data: member } = await admin.from('conversation_members').select('user_id').eq('conversation_id', conversationId).eq('user_id', userId).maybeSingle()
  if (!member) return null
  const { data } = await admin.from('direct_messages').select('id, sender_id, body, created_at').eq('conversation_id', conversationId).order('created_at')
  await admin.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('user_id', userId)
  return data ?? []
}

/** Unread direct messages across all of a user's conversations (nav badges). */
export async function unreadDirectCount(userId: string, admin: Admin = createAdminClient()) {
  const { data: memberships } = await admin.from('conversation_members').select('conversation_id, last_read_at').eq('user_id', userId)
  if (!memberships?.length) return 0
  const counts = await Promise.all(memberships.map(async m => {
    let q = admin.from('direct_messages').select('*', { count: 'exact', head: true }).eq('conversation_id', m.conversation_id).neq('sender_id', userId)
    if (m.last_read_at) q = q.gt('created_at', m.last_read_at)
    const { count } = await q
    return count ?? 0
  }))
  return counts.reduce((a, b) => a + b, 0)
}

export function messagesHref(role: string, conversationId: string) {
  return role === 'admin' ? `/admin/messages?dm=${conversationId}` : `/${role}/messages?c=${conversationId}`
}

/**
 * Sends a direct message. Either continues `conversationId` (sender must be a
 * member) or starts/continues the 1:1 with `recipientId`. Permission is checked
 * against the other member every time.
 */
export async function sendDirectMessage(args: {
  senderId: string
  senderRole: string
  senderName: string
  body: string
  conversationId?: string | null
  recipientId?: string | null
}): Promise<{ conversationId?: string; error?: string }> {
  const admin = createAdminClient()
  const text = args.body.trim().slice(0, 4000)
  if (!text) return { error: 'Empty message' }

  let conversationId = args.conversationId ?? null
  let recipientId = args.recipientId ?? null

  if (conversationId) {
    const { data: members } = await admin.from('conversation_members').select('user_id').eq('conversation_id', conversationId)
    const ids = (members ?? []).map(m => m.user_id)
    if (!ids.includes(args.senderId)) return { error: 'Not your conversation' }
    recipientId = ids.find(id => id !== args.senderId) ?? null
  }
  if (!recipientId || recipientId === args.senderId) return { error: 'No recipient' }
  if (!(await canMessage(args.senderId, args.senderRole, recipientId, admin))) {
    return { error: "You can't message this person. Brands and candidates can chat once Franchise Foundry has introduced them." }
  }

  if (!conversationId) {
    conversationId = await findConversation(args.senderId, recipientId, admin)
    if (!conversationId) {
      const { data: conv, error } = await admin.from('conversations').insert({}).select('id').single()
      if (error || !conv) return { error: error?.message ?? 'Could not start conversation' }
      conversationId = conv.id
      await admin.from('conversation_members').insert([
        { conversation_id: conv.id, user_id: args.senderId, last_read_at: new Date().toISOString() },
        { conversation_id: conv.id, user_id: recipientId },
      ])
    }
  }

  const now = new Date().toISOString()
  const { error } = await admin.from('direct_messages').insert({ conversation_id: conversationId, sender_id: args.senderId, body: text })
  if (error) return { error: error.message }
  await Promise.all([
    admin.from('conversations').update({ updated_at: now }).eq('id', conversationId),
    admin.from('conversation_members').update({ last_read_at: now }).eq('conversation_id', conversationId).eq('user_id', args.senderId),
  ])

  const { data: recipient } = await admin.from('profiles').select('role').eq('id', recipientId).single()
  try {
    await notify({
      userId: recipientId,
      event: 'new_message',
      title: `New message from ${args.senderName}`,
      body: text.length > 140 ? `${text.slice(0, 140)}…` : text,
      link: messagesHref(recipient?.role ?? 'franchisee', conversationId!),
    })
  } catch (e) { console.error('[dm] notify failed', e) }

  return { conversationId: conversationId! }
}

/**
 * Admins who should hear about a new client message: the admins already in
 * that thread (have replied in it) plus the franchisee's assigned admin. Falls
 * back to every admin only when nobody has picked the thread up yet, so a new
 * enquiry never goes unseen.
 */
export async function threadAdminIds(threadType: string, threadId: string, admin: Admin = createAdminClient()) {
  const ids = new Set<string>()
  const { data: sent } = await admin.from('messages').select('sender_id').eq('thread_type', threadType).eq('thread_id', threadId).eq('from_admin', true)
  for (const m of sent ?? []) if (m.sender_id) ids.add(m.sender_id)
  if (threadType === 'franchisee') {
    const { data: fe } = await admin.from('franchisee_profiles').select('assigned_admin').eq('id', threadId).maybeSingle()
    if (fe?.assigned_admin) ids.add(fe.assigned_admin)
  }
  if (ids.size) {
    // Only people who are still admins
    const { data: still } = await admin.from('profiles').select('id').in('id', [...ids]).eq('role', 'admin')
    if (still?.length) return still.map(p => p.id)
  }
  const { data: all } = await admin.from('profiles').select('id').eq('role', 'admin')
  return (all ?? []).map(p => p.id)
}
