import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'

const variants: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  gold: 'bg-amber-50 text-amber-800',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: Variant
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    pending_invite: { label: 'Invite sent', variant: 'info' },
    active:         { label: 'Active', variant: 'success' },
    signed:         { label: 'Signed', variant: 'gold' },
    inactive:       { label: 'Inactive', variant: 'default' },
    draft:          { label: 'Draft', variant: 'default' },
    pending_review: { label: 'Pending review', variant: 'warning' },
    suggested:      { label: 'Suggested', variant: 'default' },
    shown:          { label: 'Shown', variant: 'info' },
    interested:     { label: 'Interested', variant: 'success' },
    intro_made:     { label: 'Intro made', variant: 'gold' },
    declined:       { label: 'Declined', variant: 'danger' },
    pending:        { label: 'Pending', variant: 'warning' },
    sent:           { label: 'Sent', variant: 'info' },
    completed:      { label: 'Completed', variant: 'success' },
  }
  const entry = map[status] ?? { label: status, variant: 'default' as Variant }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}
