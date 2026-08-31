'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const VIEWS: [string, string][] = [
  ['/admin', 'Admin'],
  ['/franchisee', 'Franchisee'],
  ['/franchisor', 'Brand'],
  ['/introducer', 'Agent'],
]

/**
 * Quick portal-view switcher for admins. The middleware already lets admins into
 * every portal, so this is plain navigation — no impersonation, works on the
 * deploy-preview where magic-link account-switching doesn't. Lets you browse the
 * client-portal UX directly.
 */
export function ViewSwitcher() {
  const path = usePathname()
  const active = VIEWS.find(([h]) => h !== '/admin' && path.startsWith(h))?.[0] ?? '/admin'
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 px-1 mb-1.5">View portal as</p>
      <div className="grid grid-cols-2 gap-1">
        {VIEWS.map(([href, label]) => (
          <Link key={href} href={href}
            className={cn(
              'text-[11px] font-semibold rounded-lg px-2 py-1.5 text-center transition-colors',
              active === href ? 'bg-surface text-ff-green shadow-sm' : 'bg-surface/[0.08] text-white/70 hover:bg-surface/[0.14] hover:text-white',
            )}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
