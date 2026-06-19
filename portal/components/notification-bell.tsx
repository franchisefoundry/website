'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BellIcon, AgreementIcon, FranchiseeIcon, FranchisorIcon,
  QuestionnaireIcon, LeadsIcon, MatchIcon,
} from '@/components/icons'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

/** Maps a notification type to a distinct icon + tinted colour so the list scans fast. */
function notificationStyle(type: string): { Icon: React.ComponentType<{ className?: string }>; bg: string; fg: string } {
  if (type.startsWith('agreement_signed')) return { Icon: AgreementIcon, bg: 'bg-emerald-50', fg: 'text-emerald-600' }
  if (type.startsWith('agreement_comment')) return { Icon: AgreementIcon, bg: 'bg-amber-50', fg: 'text-amber-600' }
  if (type.startsWith('agreement')) return { Icon: AgreementIcon, bg: 'bg-sky-50', fg: 'text-sky-600' }
  if (type.startsWith('franchisor_quiz')) return { Icon: QuestionnaireIcon, bg: 'bg-violet-50', fg: 'text-violet-600' }
  if (type.startsWith('franchisor')) return { Icon: FranchisorIcon, bg: 'bg-slate-100', fg: 'text-slate-500' }
  if (type.startsWith('franchisee')) return { Icon: FranchiseeIcon, bg: 'bg-slate-100', fg: 'text-slate-500' }
  if (type.includes('lead') || type.includes('invite')) return { Icon: LeadsIcon, bg: 'bg-amber-50', fg: 'text-amber-600' }
  if (type.includes('intro') || type.includes('match')) return { Icon: MatchIcon, bg: 'bg-violet-50', fg: 'text-violet-600' }
  return { Icon: BellIcon, bg: 'bg-slate-100', fg: 'text-slate-500' }
}

interface NotificationBellProps {
  /** compact=true renders a small icon button (for sidebar header). Default renders a full nav-item row. */
  compact?: boolean
}

export function NotificationBell({ compact = false }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen]                   = useState(false)
  const [dropPos, setDropPos]             = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setNotifications(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unread = notifications.filter(n => !n.read).length

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const isMd = window.innerWidth >= 768
      if (isMd) {
        setDropPos({ top: rect.top, left: rect.right + 8 })
      } else {
        // Clamp so the 320px-wide dropdown never spills off the right edge
        const maxLeft = window.innerWidth - 320 - 8
        setDropPos({ top: rect.bottom + 4, left: Math.min(Math.max(8, rect.left), Math.max(8, maxLeft)) })
      }
    }
    setOpen(o => !o)
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function clearRead() {
    // Optimistically drop read items, then persist
    setNotifications(prev => prev.filter(n => !n.read))
    await fetch('/api/notifications', { method: 'DELETE' })
  }

  async function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== id))
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' })
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  const hasRead = notifications.some(n => n.read)

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const dropdown = open && (
    <div
      ref={dropRef}
      style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 200 }}
      className="w-80 max-w-[calc(100vw-16px)] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-800">Notifications</p>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-brand-green hover:underline">
              Mark all read
            </button>
          )}
          {hasRead && (
            <button onClick={clearRead} className="text-xs text-slate-400 hover:text-slate-600 hover:underline">
              Clear read
            </button>
          )}
        </div>
      </div>
      {notifications.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-slate-400">No notifications yet</div>
      ) : (
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
          {notifications.slice(0, 10).map(n => {
            const { Icon, bg, fg } = notificationStyle(n.type)
            return (
              <div
                key={n.id}
                className={cn(
                  'group relative flex gap-3 items-start px-4 py-3 transition-colors hover:bg-slate-50',
                  !n.read && 'bg-brand-green/[0.03]'
                )}
              >
                <button
                  onClick={() => handleNotificationClick(n)}
                  className="flex gap-3 items-start flex-1 min-w-0 text-left"
                >
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                    <Icon className={cn('w-3.5 h-3.5', fg)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs', n.read ? 'font-medium text-slate-500' : 'font-semibold text-slate-800')}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-slate-400 truncate mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-slate-300 mt-1">{relativeTime(n.created_at)}</p>
                  </div>
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 flex-shrink-0" />}
                </button>
                <button
                  onClick={e => dismiss(n.id, e)}
                  aria-label="Dismiss notification"
                  className="flex-shrink-0 w-5 h-5 -mr-1 rounded flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  if (compact) {
    return (
      <>
        <button
          ref={btnRef}
          onClick={handleOpen}
          aria-label="Notifications"
          className="relative p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <BellIcon className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#3a4a3a]" />
          )}
        </button>
        {dropdown}
      </>
    )
  }

  return (
    <>
      {/* Full nav-item styled trigger */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          open
            ? 'text-white bg-white/10'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        )}
        aria-label="Notifications"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex-shrink-0 opacity-70">
            <BellIcon className="w-4 h-4" />
          </span>
          Notifications
        </div>
        {unread > 0 && (
          <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {dropdown}
    </>
  )
}
