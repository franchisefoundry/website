'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface SettingsTab {
  id: string
  label: string
  icon?: React.ReactNode
  content: React.ReactNode
}

/**
 * Tabbed layout. `orientation="side"` (default) is a left vertical nav + panel —
 * good for settings. `orientation="top"` is a full-width horizontal tab bar +
 * full-width panel — use when the panel itself needs the whole width (e.g. an
 * editor with its own columns). All panels render; inactive ones are hidden so
 * server content and panel state persist across switches.
 */
export function SettingsTabs({ tabs, orientation = 'side' }: { tabs: SettingsTab[]; orientation?: 'side' | 'top' }) {
  const [active, setActive] = useState(tabs[0]?.id)
  const panels = (
    <div className="min-w-0">
      {tabs.map(t => (
        <div key={t.id} className={active === t.id ? 'block rise' : 'hidden'}>{t.content}</div>
      ))}
    </div>
  )

  if (orientation === 'top') {
    return (
      <div>
        <div className="flex gap-1 border-b border-line mb-6 overflow-x-auto scrollbar-hidden">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)}
              className={cn(
                'relative -mb-px inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex-shrink-0',
                active === t.id ? 'border-ff-green text-ink' : 'border-transparent text-ink-3 hover:text-ink-2',
              )}>
              {t.icon && <span className="flex-shrink-0 opacity-80">{t.icon}</span>}
              {t.label}
            </button>
          ))}
        </div>
        {panels}
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-[210px_1fr] gap-6 items-start">
      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible scrollbar-hidden -mx-1 px-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)}
            className={cn(
              'flex items-center gap-2.5 text-sm font-medium rounded-xl px-3.5 py-2.5 text-left whitespace-nowrap transition-colors flex-shrink-0',
              active === t.id ? 'bg-ff-green/10 text-ff-green' : 'text-ink-2 hover:bg-surface-2',
            )}>
            {t.icon && <span className="flex-shrink-0 opacity-80">{t.icon}</span>}
            {t.label}
          </button>
        ))}
      </nav>
      {panels}
    </div>
  )
}
