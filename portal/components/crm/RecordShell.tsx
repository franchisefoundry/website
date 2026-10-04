'use client'

import { useEffect, useRef, useState } from 'react'
import { cn, initials } from '@/lib/utils'
import { Tabs, type TabItem } from '@/components/ui/tabs'
import {
  ArrowRightIcon, MailIcon, MessageIcon, MoreIcon,
  ArchiveIcon, TrashIcon, ExpandIcon, CloseIcon,
} from '@/components/icons'

/**
 * The CRM record shell — the chrome every record (franchisee, brand, agent)
 * shares. Presentational only: all data/behaviour comes in via props, so it
 * carries no Supabase/routing concerns (per the redesign rule: UX/UI only).
 *
 * Layout, top→bottom:
 *   • Header: media + title/subtitle + status, quick-actions (Advance stage,
 *     Email→Gmail, Message), overflow ⋯ (Archive/Delete + contextual Resend
 *     invite). Colour rule: green = the primary action; there are no gold
 *     accents here (gold is reserved for notification counts, e.g. tab badges).
 *   • Optional stage tracker (the journey stepper).
 *   • Tab bar (Overview / Activity / Messages) + the active panel (children).
 *
 * Renders identically in a Drawer and as a full page — pass `chrome` to show the
 * expand/close controls when hosted in the slide-over.
 */
interface QuickAction {
  label: string
  onClick: () => void
  disabled?: boolean
}

interface RecordShellProps {
  title: string
  subtitle?: React.ReactNode
  /** Logo/avatar image; falls back to initials of `title`. */
  mediaUrl?: string | null
  /** Status pill node (e.g. statusBadge(...)). */
  status?: React.ReactNode

  /** Journey stepper node (e.g. <StageTracker …/>). */
  stage?: React.ReactNode

  /** Primary green action, typically "Advance stage". */
  primaryAction?: QuickAction
  /** Email address → opens a Gmail compose window. */
  email?: string | null
  /** In-app message / open chat. */
  onMessage?: () => void

  /** Shown in the ⋯ menu only when the record is awaiting invite acceptance. */
  resendInvite?: { onClick: () => void; label?: string }
  onArchive?: () => void
  onDelete?: () => void

  tabs: TabItem[]
  activeTab: string
  onTabChange: (value: string) => void

  /** Drawer chrome — expand-to-full-page and close. Omit for full-page render. */
  chrome?: { onExpand?: () => void; onClose?: () => void }

  children: React.ReactNode
}

function gmailCompose(email: string) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`
}

export function RecordShell({
  title, subtitle, mediaUrl, status, stage,
  primaryAction, email, onMessage,
  resendInvite, onArchive, onDelete,
  tabs, activeTab, onTabChange, chrome, children,
}: RecordShellProps) {
  const hasOverflow = Boolean(resendInvite || onArchive || onDelete)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chrome row (drawer only) */}
      {chrome && (
        <div className="flex items-center justify-end gap-1 px-4 pt-3">
          {chrome.onExpand && (
            <button
              onClick={chrome.onExpand}
              aria-label="Expand to full page"
              className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <ExpandIcon className="w-4 h-4" />
            </button>
          )}
          {chrome.onClose && (
            <button
              onClick={chrome.onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-4 pb-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-ff-green-soft flex items-center justify-center flex-shrink-0 overflow-hidden">
              {mediaUrl
                ? <img src={mediaUrl} alt={title} className="w-full h-full object-contain p-1" />
                : <span className="text-ff-green text-base font-bold">{initials(title)}</span>}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-semibold text-ink leading-tight truncate">{title}</h2>
                {status}
              </div>
              {subtitle && <p className="text-sm text-ink-2 mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {email && (
              <a
                href={gmailCompose(email)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors"
              >
                <MailIcon className="w-4 h-4" /> Email
              </a>
            )}
            {onMessage && (
              <button
                onClick={onMessage}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors"
              >
                <MessageIcon className="w-4 h-4" /> Message
              </button>
            )}
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-ff-green text-white shadow-sm hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {primaryAction.label} <ArrowRightIcon className="w-4 h-4" />
              </button>
            )}
            {hasOverflow && (
              <OverflowMenu
                resendInvite={resendInvite}
                onArchive={onArchive}
                onDelete={onDelete}
              />
            )}
          </div>
        </div>

        {stage && <div className="mt-4">{stage}</div>}
      </div>

      {/* Tabs */}
      <div className="px-6 flex-shrink-0">
        <Tabs tabs={tabs} value={activeTab} onChange={onTabChange} />
      </div>

      {/* Active panel */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        {children}
      </div>
    </div>
  )
}

function OverflowMenu({
  resendInvite, onArchive, onDelete,
}: Pick<RecordShellProps, 'resendInvite' | 'onArchive' | 'onDelete'>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item = 'flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition-colors'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-2 rounded-xl text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors"
      >
        <MoreIcon className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-52 bg-surface border border-line rounded-xl shadow-lg py-1 z-10"
        >
          {resendInvite && (
            <button
              role="menuitem"
              onClick={() => { setOpen(false); resendInvite.onClick() }}
              className={cn(item, 'text-ink-2 hover:bg-surface-2')}
            >
              <MailIcon className="w-4 h-4" /> {resendInvite.label ?? 'Resend invite'}
            </button>
          )}
          {onArchive && (
            <button
              role="menuitem"
              onClick={() => { setOpen(false); onArchive() }}
              className={cn(item, 'text-ink-2 hover:bg-surface-2')}
            >
              <ArchiveIcon className="w-4 h-4" /> Archive…
            </button>
          )}
          {onDelete && (
            <button
              role="menuitem"
              onClick={() => { setOpen(false); onDelete() }}
              className={cn(item, 'text-red-600 hover:bg-red-50')}
            >
              <TrashIcon className="w-4 h-4" /> Delete…
            </button>
          )}
        </div>
      )}
    </div>
  )
}
