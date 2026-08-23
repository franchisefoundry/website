import { cn } from '@/lib/utils'

/**
 * Horizontal journey stepper. Green = progress (colour rule: green for all
 * emphasis/trackers; gold is reserved for notifications only). Generic over any
 * ordered stage list — pass FRANCHISEE_PIPELINE_STAGES for the franchisee
 * journey or MATCH_PIPELINE_STAGES for a matched brand.
 */
interface Stage {
  value: string
  label: string
  emoji?: string
}

interface StageTrackerProps {
  stages: Stage[]
  /** Zero-based index of the current stage (use the pipeline helpers to derive). */
  currentIndex: number
  className?: string
}

export function StageTracker({ stages, currentIndex, className }: StageTrackerProps) {
  return (
    <ol className={cn('flex items-center gap-1 overflow-x-auto scrollbar-hidden', className)}>
      {stages.map((stage, i) => {
        const done = i < currentIndex
        const current = i === currentIndex
        return (
          <li key={stage.value} className="flex items-center gap-1 shrink-0">
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                current && 'bg-ff-green text-white',
                done && 'bg-ff-green/10 text-ff-green',
                !done && !current && 'bg-surface-2 text-ink-3',
              )}
              aria-current={current ? 'step' : undefined}
            >
              <span
                className={cn(
                  'inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold',
                  current && 'bg-white/25 text-white',
                  done && 'bg-ff-green text-white',
                  !done && !current && 'bg-line text-ink-3',
                )}
              >
                {done ? '✓' : i + 1}
              </span>
              {stage.label}
            </div>
            {i < stages.length - 1 && (
              <span
                className={cn('w-3 h-px shrink-0', i < currentIndex ? 'bg-ff-green/40' : 'bg-line')}
                aria-hidden
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
