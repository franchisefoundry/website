'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Props {
  current: 'cards' | 'kanban' | 'list'
}

const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors'
const on = 'bg-white text-ink shadow-sm'
const off = 'text-ink-3 hover:text-ink-2'

export default function ViewToggle({ current }: Props) {
  return (
    <div className="flex items-center bg-surface-2 rounded-lg p-0.5 gap-0.5">
      <Link href="/admin/franchisees" className={cn(base, current === 'cards' ? on : off)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
          <rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.8"/>
          <rect x="7.5" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.6"/>
          <rect x="1" y="7.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.6"/>
          <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.4"/>
        </svg>
        Cards
      </Link>
      <Link href="/admin/franchisees?view=kanban" className={cn(base, current === 'kanban' ? on : off)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
          <rect x="1" y="1" width="3.5" height="12" rx="1" fill="currentColor" opacity="0.8"/>
          <rect x="5.25" y="1" width="3.5" height="8" rx="1" fill="currentColor" opacity="0.6"/>
          <rect x="9.5" y="1" width="3.5" height="10" rx="1" fill="currentColor" opacity="0.4"/>
        </svg>
        Kanban
      </Link>
      <Link href="/admin/franchisees?view=list" className={cn(base, current === 'list' ? on : off)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
          <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.8"/>
          <rect x="1" y="6.25" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.6"/>
          <rect x="1" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.4"/>
        </svg>
        Table
      </Link>
    </div>
  )
}
