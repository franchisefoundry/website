'use client'

import { useRef } from 'react'

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

// Axis tick marks — positioned at their true percentage on the scale
const AXIS_TICKS = [
  { label: '£5k',    idx: 0  },
  { label: '£50k',   idx: 4  },
  { label: '£100k',  idx: 6  },
  { label: '£200k',  idx: 8  },
  { label: '£500k+', idx: 11 },
]

interface Props {
  min: number
  max: number
  onChange: (min: number, max: number) => void
  variant?: 'dark' | 'light'
}

export function DualRangeSlider({ min, max, onChange, variant = 'light' }: Props) {
  const accent = variant === 'dark' ? '#3a4a3a' : 'var(--color-brand-green, #3a4a3a)'

  // Live indices stored in refs — shared between both sliders for constraint enforcement
  const minIdx = useRef(nearestIdx(min))
  const maxIdx = useRef(nearestIdx(max))

  // Min slider DOM refs
  const minFillRef  = useRef<HTMLDivElement>(null)
  const minThumbRef = useRef<HTMLDivElement>(null)
  const minValRef   = useRef<HTMLSpanElement>(null)

  // Max slider DOM refs
  const maxFillRef  = useRef<HTMLDivElement>(null)
  const maxThumbRef = useRef<HTMLDivElement>(null)
  const maxValRef   = useRef<HTMLSpanElement>(null)

  function setMinDOM(idx: number) {
    const pct = (idx / N) * 100
    if (minFillRef.current)  minFillRef.current.style.width  = `${pct}%`
    if (minThumbRef.current) minThumbRef.current.style.left  = `${pct}%`
    if (minValRef.current)   minValRef.current.textContent   = fmt(INVESTMENT_STEPS[idx])
  }

  function setMaxDOM(idx: number) {
    const pct = (idx / N) * 100
    if (maxFillRef.current)  maxFillRef.current.style.width  = `${pct}%`
    if (maxThumbRef.current) maxThumbRef.current.style.left  = `${pct}%`
    if (maxValRef.current)   maxValRef.current.textContent   = fmt(INVESTMENT_STEPS[idx])
  }

  const initMinPct = (minIdx.current / N) * 100
  const initMaxPct = (maxIdx.current / N) * 100

  return (
    <div className="space-y-5">

      {/* ── Minimum slider ─────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Minimum</span>
          <span ref={minValRef} className="text-xl font-bold" style={{ color: accent }}>
            {fmt(INVESTMENT_STEPS[minIdx.current])}
          </span>
        </div>
        <div className="relative h-9 flex items-center">
          <div className="absolute left-0 right-0 h-2 bg-slate-200 rounded-full">
            <div
              ref={minFillRef}
              className="absolute left-0 h-full rounded-full"
              style={{ width: `${initMinPct}%`, backgroundColor: accent }}
            />
          </div>
          <div
            ref={minThumbRef}
            className="absolute w-5 h-5 bg-white rounded-full shadow-md border-2 pointer-events-none -translate-x-1/2"
            style={{ left: `${initMinPct}%`, borderColor: accent }}
          />
          <input
            type="range" min={0} max={N} step={1}
            defaultValue={minIdx.current}
            onChange={e => {
              // Clamp: can't meet or exceed max
              const raw = +e.target.value
              const clamped = Math.min(raw, maxIdx.current - 1)
              if (raw !== clamped) (e.target as HTMLInputElement).value = String(clamped)
              minIdx.current = clamped
              setMinDOM(clamped)
            }}
            onPointerUp={() => onChange(INVESTMENT_STEPS[minIdx.current], INVESTMENT_STEPS[maxIdx.current])}
            onKeyUp={()   => onChange(INVESTMENT_STEPS[minIdx.current], INVESTMENT_STEPS[maxIdx.current])}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* ── Maximum slider ─────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Maximum</span>
          <span ref={maxValRef} className="text-xl font-bold" style={{ color: accent }}>
            {fmt(INVESTMENT_STEPS[maxIdx.current])}
          </span>
        </div>
        <div className="relative h-9 flex items-center">
          <div className="absolute left-0 right-0 h-2 bg-slate-200 rounded-full">
            <div
              ref={maxFillRef}
              className="absolute left-0 h-full rounded-full"
              style={{ width: `${initMaxPct}%`, backgroundColor: accent }}
            />
          </div>
          <div
            ref={maxThumbRef}
            className="absolute w-5 h-5 bg-white rounded-full shadow-md border-2 pointer-events-none -translate-x-1/2"
            style={{ left: `${initMaxPct}%`, borderColor: accent }}
          />
          <input
            type="range" min={0} max={N} step={1}
            defaultValue={maxIdx.current}
            onChange={e => {
              // Clamp: can't meet or go below min
              const raw = +e.target.value
              const clamped = Math.max(raw, minIdx.current + 1)
              if (raw !== clamped) (e.target as HTMLInputElement).value = String(clamped)
              maxIdx.current = clamped
              setMaxDOM(clamped)
            }}
            onPointerUp={() => onChange(INVESTMENT_STEPS[minIdx.current], INVESTMENT_STEPS[maxIdx.current])}
            onKeyUp={()   => onChange(INVESTMENT_STEPS[minIdx.current], INVESTMENT_STEPS[maxIdx.current])}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* ── Shared axis labels at correct scale positions ──────── */}
      <div className="relative h-4">
        {AXIS_TICKS.map(({ label, idx }, i) => (
          <span
            key={label}
            className="absolute text-xs text-slate-400 whitespace-nowrap"
            style={{
              left: `${(idx / N) * 100}%`,
              transform:
                i === 0
                  ? 'none'
                  : i === AXIS_TICKS.length - 1
                  ? 'translateX(-100%)'
                  : 'translateX(-50%)',
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
