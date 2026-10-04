import { cn } from '@/lib/utils'

/**
 * v5 CRM content section — a titled card with an uppercase micro-label header
 * and an optional right-aligned slot. The shared building block for record
 * pages and detail views.
 */
export function Section({
  title,
  right,
  children,
  className,
  bodyClassName,
}: {
  title: string
  right?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <div className={cn('bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.04)]', className)}>
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3">{title}</h3>
        {right}
      </div>
      <div className={cn('px-5 py-4', bodyClassName)}>{children}</div>
    </div>
  )
}
