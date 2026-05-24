'use client'

import { useState } from 'react'

export const INVESTMENT_STEPS = [
  5_000, 10_000, 20_000, 30_000, 50_000, 75_000,
  100_000, 150_000, 200_000, 300_000, 400_000, 500_000,
]

const N = INVESTMENT_STEPS.length - 1

function fmt(v: number) {
  if (v >= 500_000) return '£500k+'
  if (v >= 1_000) return `£${Math.round(v / 1_000)}k`
  return `£${v.toLocaleString()}`
}

function nearestIdx(val: number) {
  const exact = INVESTMENT_STEPS.indexOf(val)
  if (exact >= 0) return exact
  return INVESTMENT_STEPS.reduce(
    (best, s, idx) =>
      Math.abs(s - val) < Math.abs(INVESTMENT_STEPS[best] - val) ? idx : best,
    0,
  )
}

interface Props {
  min: number
  max: number
  onChange: (min: number, max: number) => void
  /** 'dark' = onboarding (bg dark green), 'light' = admin/update form */
  variant?: 'dark' | 'light'
}

export function DualRangeSlider({ min, max, onChange, variant = 'light' }: Props) {
  // Local indices drive visuals on every drag tick — parent notified only on release
  const [localMinIdx, setLocalMinIdx] = useState(() => nearestIdx(min))
  const [localMaxIdx, setLocalMaxIdx] = useState(() => nearestIdx(max))

  const leftPct = (localMinIdx / N) * 100
  const rightPct = (localMaxIdx / N) * 100
  const accent = variant === 'dark' ? '#3a4a3a' : 'var(--color-brand-green, #3a4a3a)'

  function commitMin(rawIdx: number) {
    const idx = Math.min(rawIdx, localMaxIdx - 1)
    onChange(INVESTMENT_STEPS[idx], INVESTMENT_STEPS[localMaxIdx])
  }

  function commitMax(rawIdx: number) {
    const idx = Math.max(rawIdx, localMinIdx + 1)
    onChange(INVESTMENT_STEPS[localMinIdx], INVESTMENT_STEPS[idx])
  }

  return (
    <div className="space-y-4">
      {/* Value display */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-0.5">Minimum</p>
          <p className="text-2xl font-bold" style={{ color: accent }}>{fmt(INVESTMENT_STEPS[localMinIdx])}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-px bg-slate-300" />
          <span className="text-slate-400 text-xs">to</span>
          <div className="w-8 h-px bg-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-0.5">Maximum</p>
          <p className="text-2xl font-bold" style={{ color: accent }}>{fmt(INVESTMENT_STEPS[localMaxIdx])}</p>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative h-10 flex items-center">
        {/* Track */}
        <div className="absolute left-0 right-0 h-2 bg-slate-200 rounded-full">
          {/* Active fill */}
          <div
            className="absolute h-full rounded-full"
            style={{
              left: `${leftPct}%`,
              width: `${rightPct - leftPct}%`,
              backgroundColor: accent,
            }}
          />
        </div>

        {/* Visual thumb — min */}
        <div
          className="absolute w-5 h-5 bg-white rounded-full shadow-md border-2 pointer-events-none -translate-x-1/2"
          style={{ left: `${leftPct}%`, borderColor: accent }}
        />
        {/* Visual thumb — max */}
        <div
          className="absolute w-5 h-5 bg-white rounded-full shadow-md border-2 pointer-events-none -translate-x-1/2"
          style={{ left: `${rightPct}%`, borderColor: accent }}
        />

        {/* Min range input */}
        <input
          type="range"
          min={0}
          max={N}
          value={localMinIdx}
          onChange={e => {
            const v = +e.target.value
            setLocalMinIdx(Math.min(v, localMaxIdx - 1))
          }}
          onPointerUp={e => commitMin(+(e.target as HTMLInputElement).value)}
          onKeyUp={e => commitMin(+(e.target as HTMLInputElement).value)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ zIndex: localMinIdx >= localMaxIdx - 1 ? 5 : 3 }}
        />
        {/* Max range input */}
        <input
          type="range"
          min={0}
          max={N}
          value={localMaxIdx}
          onChange={e => {
            const v = +e.target.value
            setLocalMaxIdx(Math.max(v, localMinIdx + 1))
          }}
          onPointerUp={e => commitMax(+(e.target as HTMLInputElement).value)}
          onKeyUp={e => commitMax(+(e.target as HTMLInputElement).value)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ zIndex: 4 }}
        />
      </div>

      {/* Axis labels */}
      <div className="flex justify-between text-xs text-slate-400 px-0.5">
        <span>£5k</span>
        <span>£50k</span>
        <span>£100k</span>
        <span>£200k</span>
        <span>£500k+</span>
      </div>
    </div>
  )
}
