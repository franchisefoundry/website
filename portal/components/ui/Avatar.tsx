interface AvatarProps {
  name: string | null | undefined
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Square (rounded-rect) instead of circular — used for brand/company logos. */
  square?: boolean
}

const SIZES = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
}

export function Avatar({ name, size = 'sm', square = false }: AvatarProps) {
  const initials = name
    ? name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  return (
    <div
      className={`${square ? 'rounded-xl' : 'rounded-full'} bg-brand-green/10 text-brand-green font-bold flex items-center justify-center shrink-0 ${SIZES[size]}`}
    >
      {initials}
    </div>
  )
}
