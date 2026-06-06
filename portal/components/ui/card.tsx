import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-slate-100', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h2 className={cn('text-sm font-semibold text-slate-900', className)}>
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
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg ?? 'bg-slate-100')}>
            {icon}
          </div>
        )}
        {trend && (
          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      {alert && (
        <p className="mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-full inline-block bg-amber-50 text-amber-700">
          {alert}
        </p>
      )}
    </div>
  )
}
