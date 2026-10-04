'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Drawer } from '@/components/ui/drawer'
import { ExpandIcon, CloseIcon } from '@/components/icons'

/**
 * Hosts an intercepted record in the slide-over. Closing plays the drawer's
 * exit transition, then navigates back (dismissing the intercepted route).
 * Expand is a hard navigation to the record's own full page (escapes the
 * interception). Shared by every record type's @modal route.
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
  const [open, setOpen] = useState(true)

  const close = () => {
    setOpen(false)
    setTimeout(() => router.back(), 260)
  }

  return (
    <Drawer open={open} onClose={close} size="lg" ariaLabel={ariaLabel}>
      <div className="flex items-center justify-end gap-1 px-4 pt-3 flex-shrink-0">
        <a href={expandHref} title="Open full page" aria-label="Open full page"
          className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors">
          <ExpandIcon className="w-4 h-4" />
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
