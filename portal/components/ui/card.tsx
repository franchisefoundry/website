import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-surface rounded-2xl border border-line shadow-[0_1px_2px_rgba(27,33,26,0.04)]', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-line-2', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h2 className={cn('text-sm font-semibold text-ink', className)}>
      {children}
    </h2>
  )
}

export function CardBody({ children, className }: CardProps) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  iconBg?: string
  trend?: string
  alert?: string
}

export function StatCard({ label, value, sub, icon, iconBg, trend, alert }: StatCardProps) {
  return (
    <div className="bg-surface rounded-2xl border border-line p-5 shadow-[0_1px_2px_rgba(27,33,26,0.04)] hover:shadow-[0_4px_16px_rgba(27,33,26,0.06)] hover:border-line transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg ?? 'bg-surface-2 text-ink-2')}>
            {icon}
          </div>
        )}
        {trend && (
          <span className="text-[11px] font-semibold text-ff-green bg-ff-green-soft px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      <p className="text-sm text-ink-2 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-ink-3 mt-1">{sub}</p>}
      {alert && (
        <p className="mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-full inline-block bg-amber-50 text-amber-700">
          {alert}
        </p>
      )}
    </div>
  )
}
