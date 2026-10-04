import { cn } from '@/lib/utils'

/** Canonical field styling — matches the pattern used across the portal. */
const fieldBase =
  'w-full px-3.5 py-2 bg-surface border border-line rounded-xl text-sm text-ink ' +
  'placeholder:text-ink-3 transition-shadow focus:outline-none focus:ring-2 focus:ring-ff-green/25 ' +
  'focus:border-ff-green disabled:opacity-60 disabled:bg-surface-2'

export const Input = function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />
}

export const Textarea = function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'resize-none', className)} {...props} />
}

export const Select = function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, 'bg-surface', className)} {...props}>
      {children}
    </select>
  )
}

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('block text-sm font-medium text-ink-2 mb-1', className)} {...props}>
      {children}
    </label>
  )
}

/** Label + control wrapper with optional helper/error text. */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label?: string
  error?: string | null
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      {children}
      {error
        ? <p className="text-xs text-red-600 mt-1">{error}</p>
        : hint
          ? <p className="text-xs text-ink-3 mt-1">{hint}</p>
          : null}
    </div>
  )
}
