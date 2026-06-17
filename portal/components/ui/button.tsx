import Link from 'next/link'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-1'

const variants: Record<Variant, string> = {
  primary:   'bg-brand-green text-white hover:bg-brand-green-dark',
  secondary: 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50',
  danger:    'bg-red-600 text-white hover:bg-red-700',
  ghost:     'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
}

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
}

interface BaseProps {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  className?: string
  children: React.ReactNode
}

type ButtonProps = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }

type LinkProps = BaseProps & {
  href: string
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>

export function Button(props: ButtonProps | LinkProps) {
  const {
    variant = 'primary',
    size = 'md',
    fullWidth,
    className,
    children,
    ...rest
  } = props

  const classes = cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)

  if ('href' in props && props.href !== undefined) {
    const { href, ...anchorRest } = rest as LinkProps
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
