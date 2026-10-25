'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function MarketplaceTabsClient({ tabs }: { tabs: { href: string; label: string; badge?: number; exact?: boolean }[] }) {
  const path = usePathname()
  return (
    <div className="mb-5 max-w-full overflow-x-auto">
      <div className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
        {tabs.map(({ href, label, badge, exact }) => {
          const on = path === href || (!exact && path.startsWith(href + '/'))
          return (
          <Link key={href} href={href}
            className={cn('whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              on ? 'bg-ff-green text-white' : 'text-ink-2 hover:text-ink')}>
            {label}
            {!!badge && <span className={cn('ml-1.5 rounded-full px-1.5 font-mono text-[11px]', on ? 'bg-white/20' : 'bg-ff-gold/20 text-[#8a5f26]')}>{badge}</span>}
          </Link>
        )})}
      </div>
    </div>
  )
}
