import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate } from '@/lib/utils'
import { PlusIcon } from '@/components/icons'
import { sendMessage } from './actions'

export const dynamic = 'force-dynamic'

const KIND: Record<string, string> = { franchisee: 'Franchisee', franchisor: 'Brand', introducer: 'Agent' }

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ thread?: string; compose?: string }> }) {
  const sp = await searchParams
  const selected = sp.thread ?? ''
  const composing = sp.compose === '1'
  const admin = createAdminClient()

  const [{ data: messages }, { data: fes }, { data: brs }, { data: ags }] = await Promise.all([
    admin.from('messages').select('*').order('created_at', { ascending: true }),
    admin.from('franchisee_profiles').select('id, profiles!franchisee_profiles_user_id_fkey(full_name, role)'),
    admin.from('franchisor_profiles').select('id, brand_name'),
    admin.from('profiles').select('id, full_name').eq('role', 'introducer'),
  ])

  const M = messages ?? []
  // Name lookups keyed by "type:id"
  const names = new Map<string, string>()
  const feOpts: { v: string; l: string }[] = []
  const brOpts: { v: string; l: string }[] = []
  const agOpts: { v: string; l: string }[] = []
  for (const f of fes ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (f.profiles as any)
    if (p?.role !== 'franchisee') continue
    const key = `franchisee:${f.id}`; names.set(key, p?.full_name || 'Franchisee'); feOpts.push({ v: key, l: p?.full_name || 'Franchisee' })
  }
  for (const b of brs ?? []) { const key = `franchisor:${b.id}`; names.set(key, b.brand_name || 'Brand'); brOpts.push({ v: key, l: b.brand_name || 'Brand' }) }
  for (const a of ags ?? []) { const key = `introducer:${a.id}`; names.set(key, a.full_name || 'Agent'); agOpts.push({ v: key, l: a.full_name || 'Agent' }) }

  // Build threads from messages
  const threadsMap = new Map<string, { key: string; last: string; at: string; count: number }>()
  for (const m of M) {
    const key = `${m.thread_type}:${m.thread_id}`
    const t = threadsMap.get(key) ?? { key, last: '', at: '', count: 0 }
    t.last = m.body; t.at = m.created_at; t.count++
    threadsMap.set(key, t)
  }
  const threads = [...threadsMap.values()].sort((a, b) => (a.at < b.at ? 1 : -1))

  const activeKey = composing ? '' : (selected || threads[0]?.key || '')
  const activeType = activeKey.split(':')[0]
  const activeId = activeKey.split(':')[1]
  const activeMsgs = M.filter(m => `${m.thread_type}:${m.thread_id}` === activeKey)

  // Mark the client's messages in the open thread as read so the Messages nav
  // badge clears once the admin has actually seen them (mirrors the client side).
  if (activeKey) {
    await admin.from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('thread_type', activeType).eq('thread_id', activeId)
      .eq('from_admin', false).is('read_at', null)
  }

  return (
    <div>
      <PageHeader title="Messages" description="Conversations with franchisees, brands and agents." />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(27,33,26,0.04)]" style={{ height: 'calc(100vh - 200px)', minHeight: 460 }}>
        {/* Thread list */}
        <div className="border-r border-line-2 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur px-3 py-2.5 border-b border-line-2">
            <a href="/admin/messages?compose=1"
              className={`flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 transition-colors ${composing ? 'bg-ff-green text-white' : 'bg-ff-green/10 text-ff-green hover:bg-ff-green/15'}`}>
              <PlusIcon className="w-4 h-4" /> New message
            </a>
          </div>
          {threads.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-3 text-center">No conversations yet — start one with “New message” above.</p>
          ) : threads.map(t => {
            const active = t.key === activeKey
            return (
              <a key={t.key} href={`/admin/messages?thread=${encodeURIComponent(t.key)}`}
                className={`flex gap-3 items-center px-4 py-3 border-b border-line-2 transition-colors ${active ? 'bg-ff-green/[0.06]' : 'hover:bg-surface-2'}`}>
                <Avatar name={names.get(t.key)} size="md" square={t.key.startsWith('franchisor')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{names.get(t.key) || 'Conversation'}</p>
                  <p className="text-xs text-ink-3 truncate">{t.last}</p>
                </div>
              </a>
            )
          })}
        </div>

        {/* Thread view */}
        <div className="flex flex-col min-w-0">
          <div className="px-5 py-3.5 border-b border-line-2 flex items-center gap-3">
            {activeKey ? (
              <>
                <Avatar name={names.get(activeKey)} size="md" square={activeType === 'franchisor'} />
                <div><p className="text-sm font-semibold text-ink">{names.get(activeKey) || 'Conversation'}</p>
                  <p className="text-[11px] text-ink-3">{KIND[activeType] ?? ''} · portal + app</p></div>
              </>
            ) : <p className="text-sm text-ink-3">Start a conversation below</p>}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
            {activeMsgs.length === 0 ? (
              <p className="text-sm text-ink-3 text-center py-8">No messages yet.</p>
            ) : activeMsgs.map(m => (
              <div key={m.id} className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm ${m.from_admin ? 'ml-auto bg-ff-green text-white rounded-br-md' : 'bg-surface-2 border border-line-2 rounded-bl-md'}`}>
                {m.body}
                <div className={`text-[10.5px] mt-1 ${m.from_admin ? 'text-white/60' : 'text-ink-3'}`}>{m.from_admin ? 'You' : names.get(activeKey)} · {formatDate(m.created_at)}</div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <form action={sendMessage} className="border-t border-line-2 p-3 flex items-end gap-2">
            {activeKey ? (
              <input type="hidden" name="target" value={activeKey} />
            ) : (
              <select name="target" required defaultValue="" className="text-sm border border-line rounded-lg px-2.5 py-2 bg-surface text-ink max-w-[40%]">
                <option value="" disabled>To…</option>
                {feOpts.length > 0 && <optgroup label="Franchisees">{feOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</optgroup>}
                {brOpts.length > 0 && <optgroup label="Brands">{brOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</optgroup>}
                {agOpts.length > 0 && <optgroup label="Agents">{agOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</optgroup>}
              </select>
            )}
            <input name="body" required placeholder="Write a message…" className="flex-1 text-sm border border-line rounded-lg px-3 py-2 bg-surface text-ink outline-none focus:ring-2 focus:ring-ff-green" />
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-ff-green text-white hover:brightness-110 transition-all">Send</button>
          </form>
        </div>
      </div>
    </div>
  )
}
