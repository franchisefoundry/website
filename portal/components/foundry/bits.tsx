import { cn } from '@/lib/utils'
import type { TrustLevel } from '@/lib/foundry/types'

const TRUST: Record<TrustLevel, { label: string; cls: string }> = {
  recommended: { label: 'Recommended', cls: 'bg-ff-gold text-ink' },
  trusted:     { label: 'Trusted',     cls: 'bg-[var(--ff-ok-bg)] text-[var(--ff-ok)]' },
  listed:      { label: 'Listed',      cls: 'bg-surface-2 text-ink-2 border border-line' },
}

export function TrustBadge({ level, className }: { level: TrustLevel; className?: string }) {
  const t = TRUST[level] ?? TRUST.listed
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', t.cls, className)}>{t.label}</span>
}

export function DealTag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border-[1.5px] border-dashed border-ff-gold px-2.5 py-2 text-xs font-semibold text-[#8a5f26]', className)}>
      {children}
    </div>
  )
}

const MONO_SIZE = {
  sm: 'h-[26px] w-[26px] rounded-md text-xs',
  md: 'h-7 w-7 rounded-md text-[13px]',
  lg: 'h-12 w-12 rounded-xl text-xl',
}

export function Monogram({ name, size = 'md' }: { name: string; size?: keyof typeof MONO_SIZE }) {
  return (
    <span aria-hidden="true" className={cn('inline-flex flex-shrink-0 items-center justify-center bg-ff-green font-extrabold text-white', MONO_SIZE[size])}>
      {name.charAt(0)}
    </span>
  )
}

/** Gold full stop/question mark the design puts on display headings. */
export function Accent({ children }: { children: React.ReactNode }) {
  return <span className="text-ff-gold">{children}</span>
}
