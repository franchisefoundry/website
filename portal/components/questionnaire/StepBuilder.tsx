'use client'

interface Props {
  steps: string[]
  onChange: (steps: string[]) => void
  placeholder?: string
  variant?: 'dark' | 'light'
}

export function StepBuilder({ steps, onChange, placeholder = 'Describe this step…', variant = 'light' }: Props) {
  const accent = variant === 'dark' ? '#3a4a3a' : 'var(--color-brand-green, #3a4a3a)'

  function update(idx: number, val: string) {
    const next = [...steps]
    next[idx] = val
    onChange(next)
  }

  function addStep() {
    onChange([...steps, ''])
  }

  function removeStep(idx: number) {
    onChange(steps.filter((_, i) => i !== idx))
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    const next = [...steps]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onChange(next)
  }

  function moveDown(idx: number) {
    if (idx === steps.length - 1) return
    const next = [...steps]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-start gap-2 group">
          {/* Step number */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1.5"
            style={{ backgroundColor: accent }}
          >
            {idx + 1}
          </div>

          {/* Input */}
          <input
            type="text"
            value={step}
            onChange={e => update(idx, e.target.value)}
            placeholder={`${placeholder}`}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': accent } as React.CSSProperties}
          />

          {/* Controls */}
          <div className="flex flex-col gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => moveUp(idx)}
              disabled={idx === 0}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-20 text-xs"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveDown(idx)}
              disabled={idx === steps.length - 1}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-20 text-xs"
              title="Move down"
            >
              ↓
            </button>
          </div>

          {/* Remove */}
          <button
            type="button"
            onClick={() => removeStep(idx)}
            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 mt-1.5 rounded-lg hover:bg-red-50"
            title="Remove step"
          >
            ×
          </button>
        </div>
      ))}

      {/* Add step */}
      <button
        type="button"
        onClick={addStep}
        className="flex items-center gap-2 text-sm font-medium transition-colors mt-1 px-2 py-1.5 rounded-lg hover:bg-slate-50"
        style={{ color: accent }}
      >
        <span className="w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center text-lg leading-none flex-shrink-0"
          style={{ borderColor: accent }}>
          +
        </span>
        Add step
      </button>
    </div>
  )
}
