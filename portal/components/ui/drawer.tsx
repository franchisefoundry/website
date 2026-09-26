'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Reusable right-side slide-over. Generalises the mechanics proven in
 * PartnerDetailDrawer (scrim, slide-in on mount, Escape to close, body
 * scroll-lock) onto the Phase-0 design tokens. This is the foundation the CRM
 * record shell sits in — records open here by default and can expand to a full
 * page (record interaction decision #3).
 */
type DrawerSize = 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<DrawerSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}

interface DrawerProps {
  open: boolean
  onClose: () => void
  size?: DrawerSize
  /** Accessible label for the dialog (falls back to a generic label). */
  ariaLabel?: string
  className?: string
  children: React.ReactNode
}

export function Drawer({ open, onClose, size = 'md', ariaLabel, className, children }: DrawerProps) {
  // `mounted` keeps the node in the DOM through the slide-out transition;
  // `shown` drives the transition itself (off → on after a frame).
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), 300)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mounted, onClose])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/40 transition-opacity duration-300 motion-reduce:transition-none',
          shown ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? 'Details'}
        className={cn(
          'absolute top-0 right-0 h-full w-full bg-surface shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-out motion-reduce:transition-none',
          sizes[size],
          shown ? 'translate-x-0' : 'translate-x-full',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
