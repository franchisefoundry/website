'use client'

interface Props {
  /** 0 = fully Speed-first, 100 = fully Quality-first */
  value: number
  onChange: (v: number) => void
  lowLabel?: string
  highLabel?: string
  variant?: 'dark' | 'light'
}

function describe(v: number) {
  if (v < 15) return 'Growth at pace — quality catches up later'
  if (v < 35) return 'Lean toward speed, with quality guardrails'
  if (v < 65) return 'Balanced — neither is compromised'
  if (v < 85) return 'Quality leads, but growth is still a priority'
  return 'Quality above all — we won\'t rush for the sake of numbers'
}

export function SpectrumSlider({
  value,
  onChange,
  lowLabel = '⚡ Speed first',
  highLabel = '🏆 Quality first',
  variant = 'light',
}: Props) {
  const pct = value
  const accent = variant === 'dark' ? '#3a4a3a' : 'var(--color-brand-green, #3a4a3a)'

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="text-center px-4">
        <p className="text-sm font-semibold text-slate-700">{describe(value)}</p>
        <p className="text-xs text-slate-400 mt-1">{value}% quality-weighted</p>
      </div>

      {/* Slider */}
      <div className="relative h-10 flex items-center">
        {/* Gradient track */}
        <div
          className="absolute left-0 right-0 h-3 rounded-full"
          style={{
            background: 'linear-gradient(to right, #3b82f6, #10b981, #f59e0b, #f97316)',
          }}
        />

        {/* Thumb */}
        <div
          className="absolute w-6 h-6 bg-white rounded-full shadow-lg border-2 pointer-events-none -translate-x-1/2 transition-all"
          style={{ left: `${pct}%`, borderColor: accent }}
        />

        {/* Range input */}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={e => onChange(+e.target.value)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Pole labels */}
      <div className="flex justify-between text-xs font-medium px-0.5">
        <span className="text-blue-500">{lowLabel}</span>
        <span className="text-amber-500">{highLabel}</span>
      </div>
    </div>
  )
}
