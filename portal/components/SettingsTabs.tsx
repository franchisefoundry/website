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
 * Settings layout with a left vertical nav + panel (collapses to top tabs on
 * mobile). Splits a long settings page into scannable sections. All panels
 * render but inactive ones are hidden, so server-rendered content and any panel
 * state persist across tab switches.
 */
export function SettingsTabs({ tabs }: { tabs: SettingsTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id)
  return (
    <div className="grid lg:grid-cols-[210px_1fr] gap-6 items-start">
      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible scrollbar-hidden -mx-1 px-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              'flex items-center gap-2.5 text-sm font-medium rounded-xl px-3.5 py-2.5 text-left whitespace-nowrap transition-colors flex-shrink-0',
              active === t.id ? 'bg-ff-green/10 text-ff-green' : 'text-ink-2 hover:bg-surface-2',
            )}
          >
            {t.icon && <span className="flex-shrink-0 opacity-80">{t.icon}</span>}
            {t.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0">
        {tabs.map(t => (
          <div key={t.id} className={active === t.id ? 'block rise' : 'hidden'}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  )
}
