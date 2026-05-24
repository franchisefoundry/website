'use client'

import { useState } from 'react'

interface Props {
  value: number
  min: number
  max: number
  step?: number
  format: (v: number) => string
  lowLabel?: string
  highLabel?: string
  onChange: (v: number) => void
  variant?: 'dark' | 'light'
}

export function SingleSlider({
  value, min, max, step = 1, format, lowLabel, highLabel, onChange, variant = 'light',
}: Props) {
  // Local state drives visuals on every drag tick — parent is only notified on release
  const [local, setLocal] = useState(value)
  const pct = ((local - min) / (max - min)) * 100
  const accent = variant === 'dark' ? '#3a4a3a' : 'var(--color-brand-green, #3a4a3a)'

  return (
    <div className="space-y-3">
      {/* Value display */}
      <div className="text-center">
        <p className="text-3xl font-bold" style={{ color: accent }}>{format(local)}</p>
      </div>

      {/* Slider */}
      <div className="relative h-10 flex items-center">
        {/* Track background */}
        <div className="absolute left-0 right-0 h-2 bg-slate-200 rounded-full">
          {/* Fill */}
          <div
            className="absolute h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: accent }}
          />
        </div>

        {/* Thumb */}
        <div
          className="absolute w-5 h-5 bg-white rounded-full shadow-md border-2 pointer-events-none -translate-x-1/2"
          style={{ left: `${pct}%`, borderColor: accent }}
        />

        {/* Range input — updates visuals instantly, notifies parent only on release */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={local}
          onChange={e => setLocal(+e.target.value)}
          onPointerUp={e => onChange(+(e.target as HTMLInputElement).value)}
          onKeyUp={e => onChange(+(e.target as HTMLInputElement).value)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Labels */}
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-xs text-slate-400 px-0.5">
          <span>{lowLabel ?? ''}</span>
          <span>{highLabel ?? ''}</span>
        </div>
      )}
    </div>
  )
}
