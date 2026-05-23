'use client'

function colorForRating(n: number) {
  if (n <= 3) return { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', active: '#ef4444' }
  if (n <= 6) return { bg: '#fffbeb', border: '#fcd34d', text: '#d97706', active: '#f59e0b' }
  return { bg: '#f0fdf4', border: '#86efac', text: '#16a34a', active: '#22c55e' }
}

interface Props {
  value: number
  onChange: (v: number) => void
  lowLabel?: string
  highLabel?: string
}

export function GradientRating({
  value,
  onChange,
  lowLabel = 'Needs work',
  highLabel = 'World-class',
}: Props) {
  const selected = value > 0 ? colorForRating(value) : null

  return (
    <div className="space-y-3">
      {/* Buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
          const c = colorForRating(n)
          const isSelected = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all"
              style={
                isSelected
                  ? { backgroundColor: c.active, borderColor: c.active, color: '#fff' }
                  : { backgroundColor: c.bg, borderColor: c.border, color: c.text }
              }
            >
              {n}
            </button>
          )
        })}
      </div>

      {/* Selected label */}
      {selected && value > 0 && (
        <p className="text-sm font-medium" style={{ color: selected.active }}>
          {value}/10 —{' '}
          {value <= 3 ? 'There\'s significant room to improve' :
           value <= 5 ? 'Some improvements would help' :
           value <= 7 ? 'Solid, with some fine-tuning needed' :
           value <= 9 ? 'Working well — marginal gains available' :
           'Excellent process — keep refining!'}
        </p>
      )}

      {/* Axis labels */}
      <div className="flex justify-between text-xs text-slate-400">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}
