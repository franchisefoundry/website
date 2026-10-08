'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { cn, timeAgo } from '@/lib/utils'
import { PlusIcon, SearchIcon, CloseIcon } from '@/components/icons'

export interface InboxItem {
  key: string
  href: string
  name: string
  subtitle?: string
  preview?: string
  at?: string
  unread?: number
  square?: boolean
}

export interface DirectoryEntry {
  key: string
  href: string
  name: string
  subtitle?: string
  group: string
  square?: boolean
}

/**
 * Two-pane messaging shell shared by the admin and client Messages pages.
 * Left: searchable conversation list, or (after "New message") a searchable
 * directory of everyone this user is allowed to message. Right: the open
 * thread, rendered by the page and passed in as children.
 */
export function Inbox({
  items,
  activeKey,
  directory,
  startInDirectory = false,
  emptyDirectoryText = 'Nobody to message yet.',
  children,
}: {
  items: InboxItem[]
  activeKey: string
  directory: DirectoryEntry[]
  startInDirectory?: boolean
  emptyDirectoryText?: string
  children: React.ReactNode
}) {
  const [mode, setMode] = useState<'list' | 'directory'>(startInDirectory ? 'directory' : 'list')
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const match = (...s: (string | undefined)[]) => !query || s.some(x => x?.toLowerCase().includes(query))

  const shownItems = items.filter(i => match(i.name, i.subtitle, i.preview))
  const groups = useMemo(() => {
    const g = new Map<string, DirectoryEntry[]>()
    for (const d of directory) {
      if (!match(d.name, d.subtitle, d.group)) continue
      g.set(d.group, [...(g.get(d.group) ?? []), d])
    }
    return [...g.entries()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directory, query])

  const switchMode = (m: 'list' | 'directory') => { setMode(m); setQ('') }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(27,33,26,0.04)]"
      style={{ height: 'calc(100dvh - 190px)', minHeight: 480 }}
    >
      {/* Left pane — hidden on mobile while a thread is open */}
      <div className={cn('border-r border-line-2 flex flex-col min-h-0', activeKey && 'hidden md:flex')}>
        <div className="p-3 border-b border-line-2 space-y-2">
          {mode === 'list' ? (
            <button onClick={() => switchMode('directory')}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 bg-ff-green/10 text-ff-green hover:bg-ff-green/15 transition-colors">
              <PlusIcon className="w-4 h-4" /> New message
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">New message</p>
              <button onClick={() => switchMode('list')} aria-label="Back to conversations"
                className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2"><CloseIcon className="w-4 h-4" /></button>
            </div>
          )}
          <label className="flex items-center gap-2 bg-surface-2 border border-line-2 rounded-lg px-2.5 py-1.5">
            <SearchIcon className="w-4 h-4 text-ink-3 flex-shrink-0" />
            <input value={q} onChange={e => setQ(e.target.value)} autoFocus={mode === 'directory'}
              placeholder={mode === 'list' ? 'Search conversations…' : 'Search people and brands…'}
              className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-3 min-w-0" />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mode === 'list' ? (
            shownItems.length === 0 ? (
              <p className="px-4 py-8 text-sm text-ink-3 text-center">{query ? 'No conversations match.' : 'No conversations yet. Start one with "New message".'}</p>
            ) : shownItems.map(t => (
              <Link key={t.key} href={t.href}
                className={cn('flex gap-3 items-center px-4 py-3 border-b border-line-2 transition-colors', t.key === activeKey ? 'bg-ff-green/[0.06]' : 'hover:bg-surface-2')}>
                <Avatar name={t.name} size="md" square={t.square} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={cn('text-sm truncate', t.unread ? 'font-bold text-ink' : 'font-semibold text-ink')}>{t.name}</p>
                    {t.at && <span className="text-[10.5px] text-ink-3 flex-shrink-0">{timeAgo(t.at)}</span>}
                  </div>
                  <p className="text-xs text-ink-3 truncate">{t.preview || t.subtitle}</p>
                </div>
                {!!t.unread && (
                  <span className="min-w-[18px] h-[18px] bg-ff-green text-white text-[10px] font-bold rounded-full grid place-items-center px-1">{t.unread}</span>
                )}
              </Link>
            ))
          ) : groups.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-3 text-center">{query ? 'Nobody matches that search.' : emptyDirectoryText}</p>
          ) : groups.map(([group, entries]) => (
            <div key={group}>
              <p className="sticky top-0 bg-surface/95 backdrop-blur px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-ink-3">{group} · {entries.length}</p>
              {entries.map(d => (
                <Link key={d.key} href={d.href} onClick={() => switchMode('list')}
                  className="flex gap-3 items-center px-4 py-2.5 hover:bg-surface-2 transition-colors">
                  <Avatar name={d.name} size="sm" square={d.square} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{d.name}</p>
                    {d.subtitle && <p className="text-[11px] text-ink-3 truncate">{d.subtitle}</p>}
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right pane — the open thread */}
      <div className={cn('flex flex-col min-w-0 min-h-0', !activeKey && 'hidden md:flex')}>{children}</div>
    </div>
  )
}
