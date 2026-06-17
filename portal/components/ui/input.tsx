import { cn } from '@/lib/utils'

/** Canonical field styling — matches the pattern used across the portal. */
const fieldBase =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green ' +
  'focus:border-transparent disabled:opacity-60 disabled:bg-slate-50'

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
    <select className={cn(fieldBase, 'bg-white', className)} {...props}>
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
    <label className={cn('block text-sm font-medium text-slate-700 mb-1', className)} {...props}>
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
          ? <p className="text-xs text-slate-400 mt-1">{hint}</p>
          : null}
    </div>
  )
}
