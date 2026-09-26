import { Avatar } from './Avatar'
import { cn } from '@/lib/utils'

const SIZES: Record<string, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
  xl: 'w-14 h-14',
}

/**
 * Brand logo thumbnail. Shows the uploaded logo when present, otherwise falls
 * back to the initials Avatar. Use for brand identity in the ADMIN view and the
 * brand's OWN view — never on candidate-facing / anonymous matching cards.
 */
export function BrandLogo({ src, name, size = 'lg', className }: {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? 'Brand logo'}
        className={cn(SIZES[size], 'rounded-xl object-contain border border-line bg-surface p-0.5 shrink-0', className)}
      />
    )
  }
  return <Avatar name={name} size={size === 'xl' ? 'lg' : size} square />
}
