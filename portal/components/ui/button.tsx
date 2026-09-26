import Link from 'next/link'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ff-green focus-visible:ring-offset-2 focus-visible:ring-offset-ground active:translate-y-px'

const variants: Record<Variant, string> = {
  primary:   'bg-ff-green text-white shadow-sm hover:brightness-110 hover:shadow',
  secondary: 'border border-line text-ink-2 bg-surface hover:bg-surface-2 hover:border-line',
  danger:    'bg-red-600 text-white shadow-sm hover:bg-red-700',
  ghost:     'text-ink-3 hover:text-ink hover:bg-surface-2',
}

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-sm px-4 py-2.5',
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
