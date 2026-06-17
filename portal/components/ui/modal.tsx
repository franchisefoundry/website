'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  /** Tailwind max-width class. Default: max-w-sm */
  maxWidth?: string
}

export function Modal({ open, onClose, title, description, children, maxWidth = 'max-w-sm' }: ModalProps) {
  // Close on Escape + lock body scroll while open
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn('bg-white rounded-2xl shadow-xl w-full p-6', maxWidth)}
        onClick={e => e.stopPropagation()}
      >
        {title && <h2 className="text-base font-semibold text-slate-900 mb-1">{title}</h2>}
        {description && <p className="text-sm text-slate-500 mb-5">{description}</p>}
        {children}
      </div>
    </div>
  )
}
