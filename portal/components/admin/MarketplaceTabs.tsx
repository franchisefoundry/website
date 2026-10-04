'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS: [string, string][] = [
  ['/admin/partners', 'Directory'],
  ['/admin/intro-requests', 'Requests'],
  ['/admin/resales', 'Resales'],
]

/** Shared sub-nav so Marketplace, Intro requests and Resales read as one section. */
export function MarketplaceTabs() {
  const path = usePathname()
  return (
    <div className="inline-flex bg-surface border border-line rounded-xl p-1 gap-1 mb-5">
      {TABS.map(([href, label]) => (
        <Link key={href} href={href}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            path === href ? 'bg-ff-green text-white' : 'text-ink-2 hover:text-ink')}>
          {label}
        </Link>
      ))}
    </div>
  )
}
