'use client'

import { cn } from '@/lib/utils'
import type { PlanContext } from '@/lib/foundry/types'
import type { OffKey } from '@/lib/foundry/parse'
import { formatBudget } from '@/lib/foundry/parse'
import { STAGE_LABEL } from './client'

type Chip = { key: OffKey; label: string; dot: string }

/** The member's plan as chips. Click to switch a detail off for this search. */
export function planChips(plan: PlanContext): Chip[] {
  const out: Chip[] = []
  if (plan.brand) out.push({ key: 'brand', label: plan.brand, dot: '#c8924a' })
  if (plan.sector) out.push({ key: 'sector', label: plan.sector.label, dot: '#c8924a' })
  if (plan.area) out.push({ key: 'area', label: plan.area.label, dot: '#4c6a8c' })
  if (plan.budget) out.push({ key: 'budget', label: `~${formatBudget(plan.budget)}`, dot: '#8c4c6a' })
  if (plan.stage) out.push({ key: 'stage', label: `${STAGE_LABEL[plan.stage]} stage`, dot: '#5f725f' })
  return out
}

export function PlanChips({ plan, off, onToggle, readout }: {
  plan: PlanContext
  off: OffKey[]
  onToggle: (k: OffKey) => void
  readout?: string
}) {
  const chips = planChips(plan)
  if (!chips.length && !readout) return null
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-4 py-3 sm:px-6">
      {chips.length > 0 && <span className="font-mono text-[11px] tracking-wide text-ink-3">USING YOUR PLAN</span>}
      {chips.map(c => {
        const on = !off.includes(c.key)
        return (
          <button key={c.key} type="button" onClick={() => onToggle(c.key)} aria-pressed={on}
            title={on ? 'Switch off for this search' : 'Switch back on'}
            className={cn('inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
              on ? 'border-line bg-surface text-ink' : 'border-line-2 bg-transparent text-ink-3 line-through')}>
            <span aria-hidden="true" style={{ color: on ? c.dot : '#b5bdb6' }}>■</span>{c.label}
          </button>
        )
      })}
      {readout && <span className="ml-auto font-mono text-[11px] text-ink-3">{readout}</span>}
    </div>
  )
}
