import { Button } from './button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line flex items-center justify-center mb-4 text-ink-3">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="text-sm text-ink-2 mt-1 max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {action.href
            ? <Button href={action.href} size="sm">{action.label}</Button>
            : <Button onClick={action.onClick} size="sm">{action.label}</Button>}
        </div>
      )}
    </div>
  )
}
