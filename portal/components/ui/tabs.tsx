'use client'

import { cn } from '@/lib/utils'

/**
 * Lightweight controlled tab bar. Underline style on the Phase-0 tokens; the
 * active tab is green ink, inactive is muted. Optional per-tab count badge uses
 * gold — the reserved notification colour (e.g. unread Messages).
 */
export interface TabItem {
  value: string
  label: string
  /** Optional count shown as a gold pill — reserve for notification-style counts. */
  count?: number
}

interface TabsProps {
  tabs: TabItem[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-line', className)} role="tablist">
      {tabs.map(tab => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative -mb-px inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors',
              'border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ff-green focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-t',
              active
                ? 'border-ff-green text-ink'
                : 'border-transparent text-ink-3 hover:text-ink-2',
            )}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-ff-gold-soft text-ff-gold-ink text-[11px] font-semibold tabular-nums">
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
