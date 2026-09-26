'use client'

import { useRouter } from 'next/navigation'
import { Drawer } from '@/components/ui/drawer'
import { RecordShell } from '@/components/crm/RecordShell'
import type { ComponentProps } from 'react'

/**
 * A record opened in the slide-over (the CRM default). Wraps RecordShell in the
 * Drawer and wires the two pieces of chrome:
 *   • Close   → dismisses the drawer.
 *   • Expand  → navigates to the record's own full page (`expandHref`), where the
 *               very same RecordShell renders without drawer chrome.
 * Full-page navigation is opt-in (the expand affordance), never the default —
 * matching the locked record-interaction decision.
 */
type ShellProps = Omit<ComponentProps<typeof RecordShell>, 'chrome'>

interface RecordDrawerProps extends ShellProps {
  open: boolean
  onClose: () => void
  /** Full-page route for this record; enables the expand-to-full-page control. */
  expandHref?: string
  size?: ComponentProps<typeof Drawer>['size']
}

export function RecordDrawer({ open, onClose, expandHref, size = 'lg', ...shell }: RecordDrawerProps) {
  const router = useRouter()

  return (
    <Drawer open={open} onClose={onClose} size={size} ariaLabel={`${shell.title} record`}>
      <RecordShell
        {...shell}
        chrome={{
          onClose,
          onExpand: expandHref ? () => router.push(expandHref) : undefined,
        }}
      />
    </Drawer>
  )
}
