'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Drawer } from '@/components/ui/drawer'
import { ExpandIcon, CloseIcon } from '@/components/icons'

/**
 * Hosts an intercepted record in the slide-over. Closing plays the drawer's
 * exit transition, then navigates back (dismissing the intercepted route).
 * Expand is a hard navigation to the record's own full page (escapes the
 * interception). Shared by every record type's @modal route.
 *
 * Parallel-route slots keep their last active page on soft navigation, so a
 * link inside the drawer to a nested page (e.g. the brand's questionnaire)
 * would otherwise leave the drawer covering the page underneath. The drawer
 * therefore only renders while the URL is still the record it was opened on.
 */
export function RecordDrawerHost({
  children,
  expandHref,
  ariaLabel,
}: {
  children: React.ReactNode
  expandHref: string
  ariaLabel?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [home] = useState(pathname)
  const [open, setOpen] = useState(true)

  const close = () => {
    setOpen(false)
    setTimeout(() => router.back(), 260)
  }

  if (pathname !== home) return null

  return (
    <Drawer open={open} onClose={close} size="lg" ariaLabel={ariaLabel}>
      <div className="flex items-center justify-end gap-1 px-4 pt-3 flex-shrink-0">
        <a href={expandHref}
          className="inline-flex items-center gap-1.5 mr-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-ff-green bg-ff-green/10 hover:bg-ff-green/15 transition-colors">
          <ExpandIcon className="w-3.5 h-3.5" />
          Full profile
        </a>
        <button onClick={close} aria-label="Close"
          className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors">
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-1">{children}</div>
    </Drawer>
  )
}

/**
 * `(.)[id]` also intercepts static sibling routes (`/new`, `/invites`) on soft
 * navigation. When that happens, reload so the real page renders instead of an
 * empty drawer.
 */
export function LoadFullPage() {
  useEffect(() => { window.location.reload() }, [])
  return null
}
